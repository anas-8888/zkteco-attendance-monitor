<?php

namespace App\Services\Attendance;

use App\Models\Employee;
use Carbon\CarbonImmutable;

class AttendanceWorkingHoursService
{
    /**
     * @return array{start_at: CarbonImmutable, end_at: CarbonImmutable}
     */
    public function scheduledWorkWindowForDate(CarbonImmutable $date, ?Employee $employee = null): array
    {
        $configuration = $this->configurationForEmployee($employee);

        return [
            'start_at' => $this->scheduledDateTime($date, $configuration['start_time']),
            'end_at' => $this->scheduledDateTime($date, $configuration['end_time']),
        ];
    }

    public function configuration(): array
    {
        $offDays = $this->offDays();

        return [
            'start_time' => $this->startTime(),
            'end_time' => $this->endTime(),
            'off_days' => $offDays,
            'off_day_labels' => array_values(array_map(
                fn (int $day): string => DefaultWorkingHoursManager::weekdayLabels()[$day],
                $offDays,
            )),
        ];
    }

    public function configurationForEmployee(?Employee $employee): array
    {
        $offDays = $this->offDays();

        return [
            'start_time' => $this->normalizedConfiguredTimeValue($employee?->work_start_time, $this->startTime()),
            'end_time' => $this->normalizedConfiguredTimeValue($employee?->work_end_time, $this->endTime()),
            'off_days' => $offDays,
            'off_day_labels' => array_values(array_map(
                fn (int $day): string => DefaultWorkingHoursManager::weekdayLabels()[$day],
                $offDays,
            )),
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

        if ($this->isOffDay($date, $employee)) {
            return [
                'late_seconds' => 0,
                'late_human' => '0m',
            ];
        }

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

    public function lateForAbsentDay(CarbonImmutable $attendanceDate, ?Employee $employee = null): array
    {
        if ($this->isOffDay($attendanceDate, $employee)) {
            return [
                'late_seconds' => 0,
                'late_human' => '0m',
            ];
        }

        $window = $this->scheduledWorkWindowForDate($attendanceDate, $employee);
        $lateSeconds = max($window['start_at']->diffInSeconds($window['end_at'], false), 0);

        return [
            'late_seconds' => $lateSeconds,
            'late_human' => $this->formatDuration($lateSeconds),
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

    /**
     * @return array<int, int>
     */
    public function offDays(): array
    {
        $configured = config('attendance.schedule.off_days', '0');
        $values = is_array($configured)
            ? $configured
            : preg_split('/\s*,\s*/', trim((string) $configured), -1, PREG_SPLIT_NO_EMPTY);

        $offDays = collect($values)
            ->map(static fn (mixed $day): ?int => is_numeric($day) ? (int) $day : null)
            ->filter(static fn (?int $day): bool => $day !== null && $day >= 0 && $day <= 6)
            ->unique()
            ->sort()
            ->values()
            ->all();

        return $offDays === [] ? [0] : $offDays;
    }

    public function isOffDay(CarbonImmutable $date, ?Employee $employee = null): bool
    {
        unset($employee);

        return in_array($date->dayOfWeek, $this->offDays(), true);
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
