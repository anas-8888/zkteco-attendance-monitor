<?php

namespace App\Services\Attendance;

use App\Services\Attendance\Contracts\AttendanceDeviceClient;
use App\Services\Attendance\DTO\AttendanceRecord;
use App\Services\Attendance\DTO\DeviceStatus;
use App\Services\Attendance\Exceptions\DeviceConnectionException;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Log;
use Mithun\PhpZkteco\Libs\ZKTeco;
use Throwable;

class ZktecoAttendanceDeviceClient implements AttendanceDeviceClient
{
    public function usersByDeviceId(): array
    {
        return $this->withConnection(function (ZKTeco $device): array {
            $users = $device->getUsers() ?: [];
            $mapped = [];

            foreach ($users as $user) {
                $deviceUserId = (string) ($user['user_id'] ?? $user['uid'] ?? '');

                if ($deviceUserId === '') {
                    continue;
                }

                $mapped[$deviceUserId] = trim((string) ($user['name'] ?? '')) ?: "User {$deviceUserId}";
            }

            return $mapped;
        });
    }

    public function attendanceRecords(): array
    {
        return $this->withConnection(function (ZKTeco $device): array {
            return collect($device->getAttendances() ?: [])
                ->filter(fn (mixed $record): bool => is_array($record))
                ->map(fn (array $record): AttendanceRecord => $this->mapAttendanceRecord($record))
                ->filter(fn (AttendanceRecord $record): bool => $record->deviceUserId !== '')
                ->values()
                ->all();
        });
    }

    public function status(): DeviceStatus
    {
        try {
            return $this->withConnection(function (ZKTeco $device): DeviceStatus {
                return new DeviceStatus(
                    online: true,
                    deviceTime: $this->nullableString($device->getTime()),
                    firmwareVersion: $this->nullableString($device->version()),
                );
            });
        } catch (Throwable $exception) {
            Log::warning('Unable to read ZKTeco device status.', [
                'message' => $exception->getMessage(),
            ]);

            return new DeviceStatus(
                online: false,
                error: $exception->getMessage(),
            );
        }
    }

    /**
     * @template TReturn
     *
     * @param callable(ZKTeco): TReturn $callback
     * @return TReturn
     */
    private function withConnection(callable $callback): mixed
    {
        $device = $this->makeDevice();
        $connected = false;

        try {
            $connected = (bool) $device->connect();

            if (! $connected) {
                throw new DeviceConnectionException('Unable to connect to the ZKTeco device.');
            }

            return $callback($device);
        } catch (Throwable $exception) {
            Log::error('ZKTeco communication failed.', [
                'ip' => config('attendance.device.ip'),
                'port' => config('attendance.device.port'),
                'message' => $exception->getMessage(),
            ]);

            throw $exception;
        } finally {
            if ($connected) {
                try {
                    $device->disconnect();
                } catch (Throwable $exception) {
                    Log::warning('Unable to disconnect from ZKTeco device cleanly.', [
                        'message' => $exception->getMessage(),
                    ]);
                }
            }
        }
    }

    private function makeDevice(): ZKTeco
    {
        return new ZKTeco(
            host: (string) config('attendance.device.ip'),
            port: (int) config('attendance.device.port'),
            shouldPing: (bool) config('attendance.device.should_ping'),
            timeout: (int) config('attendance.device.timeout'),
            password: (int) config('attendance.device.password'),
            protocol: (string) config('attendance.device.protocol', 'tcp'),
        );
    }

    /**
     * @param array<string, mixed> $record
     */
    private function mapAttendanceRecord(array $record): AttendanceRecord
    {
        $timestamp = CarbonImmutable::parse((string) ($record['record_time'] ?? $record['timestamp'] ?? now()));
        $stateCode = $record['state'] ?? null;
        $verificationCode = $record['type'] ?? $record['verification_type'] ?? null;

        return new AttendanceRecord(
            deviceUserId: (string) ($record['user_id'] ?? $record['uid'] ?? ''),
            employeeName: null,
            timestamp: $timestamp,
            state: $this->mapState($stateCode),
            verificationType: $this->mapVerificationType($verificationCode),
            rawData: $record,
        );
    }

    private function mapState(mixed $state): string
    {
        return match ((string) $state) {
            '0' => 'check_in',
            '1' => 'check_out',
            '2' => 'break_out',
            '3' => 'break_in',
            '4' => 'overtime_in',
            '5' => 'overtime_out',
            default => 'unknown',
        };
    }

    private function mapVerificationType(mixed $type): string
    {
        return match ((string) $type) {
            '0' => 'Password',
            '1' => 'Fingerprint',
            '2' => 'Card',
            '3' => 'Password + Fingerprint',
            '4' => 'Card + Fingerprint',
            '15' => 'Face',
            '' => 'Unknown',
            default => "Unknown ({$type})",
        };
    }

    private function nullableString(mixed $value): ?string
    {
        if ($value === false || $value === null) {
            return null;
        }

        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }
}
