<?php

namespace App\Services\Attendance;

use App\Models\AttendanceLog;
use App\Models\Employee;
use App\Services\Attendance\Contracts\AttendanceDeviceClient;
use App\Services\Attendance\DTO\AttendanceRecord;
use App\Services\Attendance\DTO\DeviceStatus;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Symfony\Component\Process\PhpExecutableFinder;

class AttendanceLogSynchronizer
{
    private const LAST_ATTEMPT_CACHE_KEY = 'attendance.last_sync_attempt_at';
    private const SYNC_LOCK_CACHE_KEY = 'attendance.sync.lock';
    private const SYNC_DISPATCH_LOCK_CACHE_KEY = 'attendance.sync.dispatch.lock';
    private const DEVICE_STATUS_CACHE_KEY = 'attendance.device_status';

    public function __construct(
        private readonly AttendanceDeviceClient $device,
    ) {
    }

    /**
     * @return array{fetched: int, inserted: int, skipped: int}
     */
    public function sync(): array
    {
        return $this->runSync(waitForExistingSync: false);
    }

    /**
     * @return array{fetched: int, inserted: int, skipped: int}
     */
    public function forceSync(): array
    {
        return $this->runSync(waitForExistingSync: true);
    }

    /**
     * @return array{fetched: int, inserted: int, skipped: int, deleted: int}
     */
    public function reconcileWithDevice(): array
    {
        $lockTtlSeconds = max(10, (int) config('attendance.device.timeout', 25));
        $lock = Cache::lock(self::SYNC_LOCK_CACHE_KEY, $lockTtlSeconds);

        try {
            return $lock->block($lockTtlSeconds, fn (): array => $this->runLockedReconciliation());
        } catch (LockTimeoutException $exception) {
            throw new RuntimeException('Attendance sync is already running.', previous: $exception);
        }
    }

    /**
     * @return array{fetched: int, inserted: int, skipped: int}
     */
    private function runSync(bool $waitForExistingSync): array
    {
        $lockTtlSeconds = max(10, (int) config('attendance.device.timeout', 25));
        $lock = Cache::lock(self::SYNC_LOCK_CACHE_KEY, $lockTtlSeconds);

        if ($waitForExistingSync) {
            try {
                return $lock->block($lockTtlSeconds, fn (): array => $this->runLockedSync());
            } catch (LockTimeoutException $exception) {
                throw new RuntimeException('Attendance sync is already running.', previous: $exception);
            }
        }

        if (! $lock->get()) {
            throw new RuntimeException('Attendance sync is already running.');
        }

        try {
            return $this->runLockedSync();
        } finally {
            optional($lock)->release();
        }
    }

    /**
     * @return array{fetched: int, inserted: int, skipped: int}
     */
    private function runLockedSync(): array
    {
        Cache::put(self::LAST_ATTEMPT_CACHE_KEY, now()->toISOString());

        try {
            $result = $this->performSync();
            $this->cacheDeviceStatus(new DeviceStatus(online: true));

            return $result;
        } catch (\Throwable $exception) {
            $this->cacheDeviceStatus(new DeviceStatus(
                online: false,
                error: $exception->getMessage(),
            ));

            throw $exception;
        }
    }

    /**
     * @return array{fetched: int, inserted: int, skipped: int, deleted: int}
     */
    private function runLockedReconciliation(): array
    {
        Cache::put(self::LAST_ATTEMPT_CACHE_KEY, now()->toISOString());

        try {
            $result = $this->performReconciliation();
            $this->cacheDeviceStatus(new DeviceStatus(online: true));

            return $result;
        } catch (\Throwable $exception) {
            $this->cacheDeviceStatus(new DeviceStatus(
                online: false,
                error: $exception->getMessage(),
            ));

            throw $exception;
        }
    }

    public function triggerBackgroundSyncIfDue(): void
    {
        $this->triggerBackgroundSync();
    }

    public function triggerBackgroundSync(bool $force = false): void
    {
        if (! $force && ! $this->shouldSync()) {
            return;
        }

        $dispatchLock = Cache::lock(self::SYNC_DISPATCH_LOCK_CACHE_KEY, 5);

        if (! $dispatchLock->get()) {
            return;
        }

        try {
            $this->launchBackgroundSyncProcess();
            Cache::put(self::LAST_ATTEMPT_CACHE_KEY, now()->toISOString());
        } catch (\Throwable $exception) {
            Log::warning('Unable to dispatch attendance sync in the background.', [
                'message' => $exception->getMessage(),
            ]);
        } finally {
            optional($dispatchLock)->release();
        }
    }

    /**
     * @return array{online: bool, device_time: ?string, firmware_version: ?string, error: ?string}
     */
    public function cachedDeviceStatus(): array
    {
        return Cache::get(self::DEVICE_STATUS_CACHE_KEY, (new DeviceStatus(
            online: false,
        ))->toArray());
    }

    /**
     * @return array{fetched: int, inserted: int, skipped: int}
     */
    private function performSync(): array
    {
        $usersByDeviceId = $this->device->usersByDeviceId();

        foreach ($usersByDeviceId as $deviceUserId => $name) {
            Employee::updateOrCreate(
                ['device_user_id' => $deviceUserId],
                ['name' => $name],
            );
        }

        $existingEmployees = Employee::pluck('name', 'device_user_id')->all();
        $records = collect($this->device->attendanceRecords())
            ->sortBy(fn (AttendanceRecord $record): int => $record->timestamp->getTimestamp())
            ->values();
        $inserted = 0;
        $skipped = 0;
        $latestStatesByUser = [];

        DB::transaction(function () use ($records, $usersByDeviceId, $existingEmployees, &$inserted, &$skipped, &$latestStatesByUser): void {
            foreach ($records as $record) {
                if ($this->isFutureDatedRecord($record)) {
                    $skipped++;

                    Log::warning('Skipping attendance record with a far-future timestamp.', [
                        'device_user_id' => $record->deviceUserId,
                        'timestamp' => $record->timestamp->toDateTimeString(),
                        'raw_data' => $record->rawData,
                    ]);

                    continue;
                }

                $record = $this->resolveAmbiguousRecord($record, $latestStatesByUser);

                $employeeName = $usersByDeviceId[$record->deviceUserId]
                    ?? $existingEmployees[$record->deviceUserId]
                    ?? $record->employeeName
                    ?? "User {$record->deviceUserId}";

                $log = AttendanceLog::firstOrCreate(
                    [
                        'device_user_id' => $record->deviceUserId,
                        'timestamp' => $record->timestamp->toDateTimeString(),
                        'state' => $record->state,
                        'verification_type' => $record->verificationType,
                    ],
                    [
                        'employee_name' => $employeeName,
                        'raw_data' => $record->rawData,
                    ],
                );

                $log->wasRecentlyCreated ? $inserted++ : $skipped++;
                $latestStatesByUser[$record->deviceUserId] = $record->state;
            }
        });

        Cache::put('attendance.last_sync_at', now()->toISOString());

        Log::info('Attendance sync completed.', [
            'fetched' => count($records),
            'inserted' => $inserted,
            'skipped' => $skipped,
        ]);

        return [
            'fetched' => $records->count(),
            'inserted' => $inserted,
            'skipped' => $skipped,
        ];
    }

    /**
     * @return array{fetched: int, inserted: int, skipped: int, deleted: int}
     */
    private function performReconciliation(): array
    {
        $usersByDeviceId = $this->device->usersByDeviceId();

        foreach ($usersByDeviceId as $deviceUserId => $name) {
            Employee::updateOrCreate(
                ['device_user_id' => $deviceUserId],
                ['name' => $name],
            );
        }

        $existingEmployees = Employee::pluck('name', 'device_user_id')->all();
        $records = collect($this->device->attendanceRecords())
            ->sortBy(fn (AttendanceRecord $record): int => $record->timestamp->getTimestamp())
            ->values();
        $inserted = 0;
        $skipped = 0;
        $deleted = 0;
        $latestStatesByUser = [];
        $deviceKeys = [];

        DB::transaction(function () use (
            $records,
            $usersByDeviceId,
            $existingEmployees,
            &$inserted,
            &$skipped,
            &$deleted,
            &$latestStatesByUser,
            &$deviceKeys,
        ): void {
            foreach ($records as $record) {
                if ($this->isFutureDatedRecord($record)) {
                    $skipped++;

                    Log::warning('Skipping attendance record with a far-future timestamp during reconciliation.', [
                        'device_user_id' => $record->deviceUserId,
                        'timestamp' => $record->timestamp->toDateTimeString(),
                        'raw_data' => $record->rawData,
                    ]);

                    continue;
                }

                $record = $this->resolveAmbiguousRecord($record, $latestStatesByUser);
                $deviceKeys[$this->deviceRecordKey(
                    $record->deviceUserId,
                    $record->timestamp->toDateTimeString(),
                    $record->state,
                    $record->verificationType,
                )] = true;

                $employeeName = $usersByDeviceId[$record->deviceUserId]
                    ?? $existingEmployees[$record->deviceUserId]
                    ?? $record->employeeName
                    ?? "User {$record->deviceUserId}";

                $log = AttendanceLog::firstOrCreate(
                    [
                        'device_user_id' => $record->deviceUserId,
                        'timestamp' => $record->timestamp->toDateTimeString(),
                        'state' => $record->state,
                        'verification_type' => $record->verificationType,
                    ],
                    [
                        'employee_name' => $employeeName,
                        'raw_data' => $record->rawData,
                    ],
                );

                $log->wasRecentlyCreated ? $inserted++ : $skipped++;
                $latestStatesByUser[$record->deviceUserId] = $record->state;
            }

            $deleted = $this->deleteLogsMissingFromDevice($deviceKeys);
        });

        Cache::put('attendance.last_sync_at', now()->toISOString());

        Log::info('Attendance reconciliation completed.', [
            'fetched' => count($records),
            'inserted' => $inserted,
            'skipped' => $skipped,
            'deleted' => $deleted,
        ]);

        return [
            'fetched' => $records->count(),
            'inserted' => $inserted,
            'skipped' => $skipped,
            'deleted' => $deleted,
        ];
    }

    /**
     * @return array{ran: bool, result: ?array{fetched: int, inserted: int, skipped: int}, error: ?string}
     */
    public function syncIfDue(): array
    {
        if (! $this->shouldSync()) {
            return [
                'ran' => false,
                'result' => null,
                'error' => null,
            ];
        }

        try {
            return [
                'ran' => true,
                'result' => $this->sync(),
                'error' => null,
            ];
        } catch (\Throwable $exception) {
            Log::warning('Attendance sync attempt failed.', [
                'message' => $exception->getMessage(),
            ]);

            return [
                'ran' => true,
                'result' => null,
                'error' => $exception->getMessage(),
            ];
        }
    }

    private function shouldSync(): bool
    {
        $lastAttemptAt = Cache::get(self::LAST_ATTEMPT_CACHE_KEY);

        if (! $lastAttemptAt) {
            return true;
        }

        return CarbonImmutable::parse($lastAttemptAt)->diffInSeconds(now()) >= (int) config('attendance.device.polling_interval', 60);
    }

    /**
     * @param array<string, string> $latestStatesByUser
     */
    private function resolveAmbiguousRecord(AttendanceRecord $record, array &$latestStatesByUser): AttendanceRecord
    {
        if (! $this->isAmbiguousPunch($record)) {
            return $record;
        }

        $previousState = $latestStatesByUser[$record->deviceUserId] ?? $this->latestStoredStateBefore($record);
        $inferredState = in_array($previousState, ['check_in', 'break_in', 'overtime_in'], true)
            ? 'check_out'
            : 'check_in';

        return new AttendanceRecord(
            deviceUserId: $record->deviceUserId,
            employeeName: $record->employeeName,
            timestamp: $record->timestamp,
            state: $inferredState,
            verificationType: $this->inferVerificationTypeFromRawData($record),
            rawData: $record->rawData,
        );
    }

    private function isAmbiguousPunch(AttendanceRecord $record): bool
    {
        return $record->verificationType === 'Unknown (255)'
            && (($record->rawData['type'] ?? null) === 255 || (string) ($record->rawData['type'] ?? '') === '255');
    }

    private function latestStoredStateBefore(AttendanceRecord $record): ?string
    {
        return AttendanceLog::query()
            ->trusted()
            ->where('device_user_id', $record->deviceUserId)
            ->where('timestamp', '<', $record->timestamp->toDateTimeString())
            ->orderByDesc('timestamp')
            ->orderByDesc('id')
            ->value('state');
    }

    private function isFutureDatedRecord(AttendanceRecord $record): bool
    {
        $toleranceSeconds = max(0, (int) config('attendance.device.future_timestamp_tolerance_seconds', 43200));

        return $record->timestamp->greaterThan(CarbonImmutable::now()->addSeconds($toleranceSeconds));
    }

    private function inferVerificationTypeFromRawData(AttendanceRecord $record): string
    {
        return match ((string) ($record->rawData['state'] ?? '')) {
            '0' => 'Password',
            '1' => 'Fingerprint',
            '2' => 'Card',
            '3' => 'Password + Fingerprint',
            '4' => 'Card + Fingerprint',
            '15' => 'Face',
            default => $record->verificationType,
        };
    }

    private function cacheDeviceStatus(DeviceStatus $status): void
    {
        Cache::put(self::DEVICE_STATUS_CACHE_KEY, $status->toArray());
    }

    /**
     * @param  array<string, bool>  $deviceKeys
     */
    private function deleteLogsMissingFromDevice(array $deviceKeys): int
    {
        $deleted = 0;

        AttendanceLog::query()
            ->select(['id', 'device_user_id', 'timestamp', 'state', 'verification_type'])
            ->orderBy('id')
            ->chunkById(500, function ($logs) use ($deviceKeys, &$deleted): void {
                $idsToDelete = $logs
                    ->filter(function (AttendanceLog $log) use ($deviceKeys): bool {
                        return ! isset($deviceKeys[$this->deviceRecordKey(
                            $log->device_user_id,
                            $log->timestamp->toDateTimeString(),
                            $log->state,
                            $log->verification_type,
                        )]);
                    })
                    ->pluck('id')
                    ->all();

                if ($idsToDelete === []) {
                    return;
                }

                $deleted += count($idsToDelete);
                AttendanceLog::query()->whereIn('id', $idsToDelete)->delete();
            });

        return $deleted;
    }

    private function deviceRecordKey(
        string $deviceUserId,
        string $timestamp,
        string $state,
        string $verificationType,
    ): string {
        return implode('|', [
            $deviceUserId,
            $timestamp,
            $state,
            $verificationType,
        ]);
    }

    private function launchBackgroundSyncProcess(): void
    {
        $phpBinary = (new PhpExecutableFinder())->find(false) ?: PHP_BINARY;
        $artisanPath = base_path('artisan');

        if (DIRECTORY_SEPARATOR === '\\') {
            $command = sprintf(
                'cmd /c start "" /B %s %s attendance:sync --quiet --no-interaction',
                escapeshellarg($phpBinary),
                escapeshellarg($artisanPath),
            );

            pclose(popen($command, 'r'));

            return;
        }

        $command = sprintf(
            '%s %s attendance:sync --quiet --no-interaction > /dev/null 2>&1 &',
            escapeshellarg($phpBinary),
            escapeshellarg($artisanPath),
        );

        proc_open($command, [
            0 => ['pipe', 'r'],
            1 => ['file', '/dev/null', 'a'],
            2 => ['file', '/dev/null', 'a'],
        ], $pipes, base_path());
    }
}
