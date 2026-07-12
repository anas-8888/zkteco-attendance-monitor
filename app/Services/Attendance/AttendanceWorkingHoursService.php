<?php

namespace App\Services\Attendance;

use App\Models\Employee;
use Carbon\CarbonImmutable;

class AttendanceWorkingHoursService
{
    public function configuration(): array
    {
        return [
            'start_time' => $this->startTime(),
            'end_time' => $this->endTime(),
        ];
    }

    public function configurationForEmployee(?Employee $employee): array
    {
        return [
            'start_time' => $this->normalizedConfiguredTimeValue($employee?->work_start_time, $this->startTime()),
            'end_time' => $this->normalizedConfiguredTimeValue($employee?->work_end_time, $this->endTime()),
        ];
    }

    public function lateForAttendanceSession(
        ?CarbonImmutable $checkInAt,
        ?CarbonImmutable $checkOutAt,
        ?CarbonImmutable $attendanceDate = null,
        ?Employee $employee = null,
    ): array {
        $date = $attendanceDate
            ?? $checkInAt
            ?? $checkOutAt
            ?? CarbonImmutable::now(config('app.timezone'));
        $configuration = $this->configurationForEmployee($employee);

        $scheduledStart = $this->scheduledDateTime($date, $configuration['start_time']);

        $hasComparableTime = false;
        $lateSeconds = 0;

        if ($checkInAt) {
            $hasComparableTime = true;

            if ($checkInAt->greaterThan($scheduledStart)) {
                $lateSeconds += $scheduledStart->diffInSeconds($checkInAt);
            }
        }

        return [
            'late_seconds' => $hasComparableTime ? $lateSeconds : null,
            'late_human' => $hasComparableTime ? $this->formatDuration($lateSeconds) : '--',
        ];
    }

    public function formatDuration(int $seconds): string
    {
        if ($seconds <= 0) {
            return '0m';
        }

        $totalMinutes = intdiv($seconds, 60);
        $hours = intdiv($totalMinutes, 60);
        $minutes = $totalMinutes % 60;

        if ($hours > 0 && $minutes > 0) {
            return sprintf('%dh %dm', $hours, $minutes);
        }

        if ($hours > 0) {
            return sprintf('%dh', $hours);
        }

        return sprintf('%dm', $minutes);
    }

    private function startTime(): string
    {
        return $this->normalizedConfiguredTime('start_time', '10:00');
    }

    private function endTime(): string
    {
        return $this->normalizedConfiguredTime('end_time', '18:00');
    }

    private function normalizedConfiguredTime(string $key, string $fallback): string
    {
        $configured = trim((string) config("attendance.schedule.$key", $fallback));

        return $this->normalizedConfiguredTimeValue($configured, $fallback);
    }

    private function normalizedConfiguredTimeValue(?string $configured, string $fallback): string
    {
        $configured = trim((string) $configured);

        return preg_match('/^\d{2}:\d{2}$/', $configured) === 1
            ? $configured
            : $fallback;
    }

    private function scheduledDateTime(CarbonImmutable $date, string $time): CarbonImmutable
    {
        [$hours, $minutes] = array_map('intval', explode(':', $time));

        return $date->startOfDay()->setTime($hours, $minutes);
    }
}
