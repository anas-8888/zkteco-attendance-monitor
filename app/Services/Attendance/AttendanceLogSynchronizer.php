<?php

namespace App\Services\Attendance;

use App\Models\AttendanceLog;
use App\Models\Employee;
use App\Services\Attendance\Contracts\AttendanceDeviceClient;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AttendanceLogSynchronizer
{
    public function __construct(
        private readonly AttendanceDeviceClient $device,
    ) {
    }

    /**
     * @return array{fetched: int, inserted: int, skipped: int}
     */
    public function sync(): array
    {
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
}
