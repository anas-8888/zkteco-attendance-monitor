<?php

namespace App\Services\Attendance;

use App\Models\AttendanceLog;
use App\Models\Employee;
use App\Services\Attendance\Contracts\AttendanceDeviceClient;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AttendanceLogSynchronizer
{
    private const LAST_ATTEMPT_CACHE_KEY = 'attendance.last_sync_attempt_at';
    private const SYNC_LOCK_CACHE_KEY = 'attendance.sync.lock';

    public function __construct(
        private readonly AttendanceDeviceClient $device,
    ) {
    }

    /**
     * @return array{fetched: int, inserted: int, skipped: int}
     */
    public function sync(): array
    {
        Cache::put(self::LAST_ATTEMPT_CACHE_KEY, now()->toISOString());

        $usersByDeviceId = $this->device->usersByDeviceId();

        foreach ($usersByDeviceId as $deviceUserId => $name) {
            Employee::updateOrCreate(
                ['device_user_id' => $deviceUserId],
                ['name' => $name],
            );
        }

        $existingEmployees = Employee::pluck('name', 'device_user_id')->all();
        $records = $this->device->attendanceRecords();
        $inserted = 0;
        $skipped = 0;

        DB::transaction(function () use ($records, $usersByDeviceId, $existingEmployees, &$inserted, &$skipped): void {
            foreach ($records as $record) {
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
            }
        });

        Cache::put('attendance.last_sync_at', now()->toISOString());

        Log::info('Attendance sync completed.', [
            'fetched' => count($records),
            'inserted' => $inserted,
            'skipped' => $skipped,
        ]);

        return [
            'fetched' => count($records),
            'inserted' => $inserted,
            'skipped' => $skipped,
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

        $lock = Cache::lock(self::SYNC_LOCK_CACHE_KEY, max(10, (int) config('attendance.device.timeout', 25)));

        if (! $lock->get()) {
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
        } finally {
            optional($lock)->release();
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
}
