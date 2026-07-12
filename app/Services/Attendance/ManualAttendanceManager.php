<?php

namespace App\Services\Attendance;

use App\Models\Employee;
use App\Models\ManualAttendanceEntry;
use App\Services\Attendance\DTO\AttendanceTimelineRecord;
use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;

class ManualAttendanceManager
{
    private const OPEN_STATES = ['check_in', 'break_in', 'overtime_in'];
    private const CLOSED_STATES = ['check_out', 'break_out', 'overtime_out'];

    public function __construct(
        private readonly AttendanceTimelineService $timelineService,
    ) {
    }

    public function createManualCheckIn(string $deviceUserId, CarbonImmutable $timestamp, ?string $note = null): ManualAttendanceEntry
    {
        $employee = $this->resolveEmployee($deviceUserId);
        $this->ensureTimestampIsNotInTheFuture($timestamp, 'Manual check-in time cannot be in the future.');

        $dayRecords = $this->timelineService
            ->recordsForUserBetween($deviceUserId, $timestamp->startOfDay(), $timestamp->endOfDay())
            ->values();

        $this->ensureNoNearbyStateRecord($dayRecords, $timestamp, 'check_in', 'A check-in already exists close to this time.');

        $lastRecordBeforeTimestamp = $dayRecords
            ->filter(fn (AttendanceTimelineRecord $record): bool => $record->timestamp->lessThan($timestamp))
            ->last();

        if ($lastRecordBeforeTimestamp && in_array($lastRecordBeforeTimestamp->state, self::OPEN_STATES, true)) {
            throw ValidationException::withMessages([
                'attendance_time' => 'This employee already has an open attendance session before this time.',
            ]);
        }

        return $this->createManualEntry($deviceUserId, $employee->name, $timestamp, 'check_in', $note);
    }

    public function createManualCheckOut(string $deviceUserId, CarbonImmutable $timestamp, ?string $note = null): ManualAttendanceEntry
    {
        $employee = $this->resolveEmployee($deviceUserId);
        $this->ensureTimestampIsNotInTheFuture($timestamp, 'Manual check-out time cannot be in the future.');

        $dayRecords = $this->timelineService
            ->recordsForUserBetween($deviceUserId, $timestamp->startOfDay(), $timestamp->endOfDay())
            ->values();

        $this->ensureNoNearbyStateRecord($dayRecords, $timestamp, 'check_out', 'A check-out already exists close to this time.');

        $lastRecordBeforeTimestamp = $dayRecords
            ->filter(fn (AttendanceTimelineRecord $record): bool => $record->timestamp->lessThan($timestamp))
            ->last();

        if (! $lastRecordBeforeTimestamp || ! in_array($lastRecordBeforeTimestamp->state, self::OPEN_STATES, true)) {
            throw ValidationException::withMessages([
                'attendance_time' => 'This employee does not have an open attendance session before this time.',
            ]);
        }

        $nextRecordAfterTimestamp = $dayRecords
            ->first(fn (AttendanceTimelineRecord $record): bool => $record->timestamp->greaterThan($timestamp));

        if ($nextRecordAfterTimestamp && in_array($nextRecordAfterTimestamp->state, self::CLOSED_STATES, true)) {
            throw ValidationException::withMessages([
                'attendance_time' => 'A closing attendance event already exists after this time.',
            ]);
        }

        return $this->createManualEntry($deviceUserId, $employee->name, $timestamp, 'check_out', $note);
    }

    private function resolveEmployee(string $deviceUserId): Employee
    {
        $employee = Employee::query()->where('device_user_id', $deviceUserId)->first();

        if (! $employee) {
            throw ValidationException::withMessages([
                'device_user_id' => 'The selected employee was not found.',
            ]);
        }

        return $employee;
    }

    private function ensureTimestampIsNotInTheFuture(CarbonImmutable $timestamp, string $message): void
    {
        if ($timestamp->greaterThan(CarbonImmutable::now()->addMinutes(1))) {
            throw ValidationException::withMessages([
                'attendance_time' => $message,
            ]);
        }
    }

    /**
     * @param  \Illuminate\Support\Collection<int, AttendanceTimelineRecord>  $dayRecords
     */
    private function ensureNoNearbyStateRecord($dayRecords, CarbonImmutable $timestamp, string $state, string $message): void
    {
        $duplicateWindowSeconds = max(0, (int) config('attendance.device.manual_duplicate_window_seconds', 900));
        $hasNearbyStateRecord = $dayRecords->contains(function (AttendanceTimelineRecord $record) use ($timestamp, $duplicateWindowSeconds, $state): bool {
            if ($record->state !== $state) {
                return false;
            }

            return abs($record->timestamp->getTimestamp() - $timestamp->getTimestamp()) <= $duplicateWindowSeconds;
        });

        if ($hasNearbyStateRecord) {
            throw ValidationException::withMessages([
                'attendance_time' => $message,
            ]);
        }
    }

    private function createManualEntry(
        string $deviceUserId,
        string $employeeName,
        CarbonImmutable $timestamp,
        string $state,
        ?string $note = null,
    ): ManualAttendanceEntry {
        return ManualAttendanceEntry::query()->create([
            'device_user_id' => $deviceUserId,
            'employee_name' => $employeeName,
            'timestamp' => $timestamp->toDateTimeString(),
            'state' => $state,
            'verification_type' => 'Manual Entry',
            'note' => $note ? trim($note) : null,
        ]);
    }
}
