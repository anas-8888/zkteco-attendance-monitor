<?php

namespace App\Services\Attendance;

use App\Services\Attendance\Contracts\AttendanceDeviceClient;
use App\Services\Attendance\DTO\AttendanceRecord;
use App\Services\Attendance\DTO\DeviceStatus;
use App\Services\Attendance\Exceptions\DeviceConnectionException;
use Illuminate\Support\Facades\Log;
use Mithun\PhpZkteco\Libs\ZKTeco;
use Throwable;

class ZktecoAttendanceDeviceClient implements AttendanceDeviceClient
{
    public function __construct(
        private readonly AttendanceRecordMapper $recordMapper,
    ) {
    }

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
                ->map(fn (array $record): AttendanceRecord => $this->recordMapper->fromDevicePayload($record))
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
        $errors = [];

        foreach ($this->connectionProtocols() as $protocol) {
            $device = null;
            $connected = false;

            try {
                $device = $this->makeDevice($protocol);
                $connected = (bool) $device->connect();

                if (! $connected) {
                    throw new DeviceConnectionException("Unable to connect to the ZKTeco device over {$protocol}.");
                }

                return $callback($device);
            } catch (Throwable $exception) {
                $errors[] = sprintf('%s: %s', strtoupper($protocol), $exception->getMessage());

                Log::error('ZKTeco communication failed.', [
                    'ip' => config('attendance.device.ip'),
                    'port' => config('attendance.device.port'),
                    'protocol' => $protocol,
                    'message' => $exception->getMessage(),
                ]);
            } finally {
                if ($connected && $device !== null) {
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

        throw new DeviceConnectionException(
            $errors !== []
                ? implode(' | ', $errors)
                : 'Unable to connect to the ZKTeco device.'
        );
    }

    /**
     * @return array<int, string>
     */
    private function connectionProtocols(): array
    {
        $configuredProtocol = strtolower(trim((string) config('attendance.device.protocol', 'tcp')));

        return match ($configuredProtocol) {
            'udp' => ['udp', 'tcp'],
            'auto' => ['tcp', 'udp'],
            default => ['tcp', 'udp'],
        };
    }

    private function makeDevice(string $protocol): ZKTeco
    {
        return new ZKTeco(
            host: (string) config('attendance.device.ip'),
            port: (int) config('attendance.device.port'),
            shouldPing: (bool) config('attendance.device.should_ping'),
            timeout: (int) config('attendance.device.timeout'),
            password: (int) config('attendance.device.password'),
            protocol: $protocol,
        );
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
