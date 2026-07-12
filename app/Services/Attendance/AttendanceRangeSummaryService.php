<?php

namespace App\Services\Attendance;

use App\Models\Employee;
use App\Services\Attendance\DTO\AttendanceTimelineRecord;
use Carbon\CarbonImmutable;

class AttendanceRangeSummaryService
{
    public function __construct(
        private readonly AttendanceTimelineService $timelineService,
    ) {
    }

    /**
     * @return array{
     *     device_user_id: string,
     *     employee_name: string,
     *     from_date: string,
     *     to_date: string,
     *     total_duration_seconds: int,
     *     total_duration_human: string,
     *     normal_duration_seconds: int,
     *     normal_duration_human: string,
     *     overtime_duration_seconds: int,
     *     overtime_duration_human: string
     * }
     */
    public function summarize(string $deviceUserId, CarbonImmutable $fromDate, CarbonImmutable $toDate): array
    {
        $rangeStart = $fromDate->startOfDay();
        $rangeEnd = $toDate->endOfDay();

        $previousRecord = $this->timelineService->previousRecordForUserBefore($deviceUserId, $rangeStart);
        $records = $this->timelineService->recordsForUserBetween($deviceUserId, $rangeStart, $rangeEnd);

        $employeeName = $records->last()?->employeeName
            ?? $previousRecord?->employeeName
            ?? Employee::query()->where('device_user_id', $deviceUserId)->value('name')
            ?? $deviceUserId;
        $normalActiveAt = null;
        $overtimeActiveAt = null;
        $normalDurationSeconds = 0;
        $overtimeDurationSeconds = 0;

        foreach ($records as $record) {
            $timestamp = $record->timestamp;
            $this->expireActiveSessionFromPreviousDay($normalActiveAt, $timestamp);
            $this->expireActiveSessionFromPreviousDay($overtimeActiveAt, $timestamp);

            switch ($record->state) {
                case 'check_in':
                case 'break_in':
                    if ($overtimeActiveAt) {
                        $overtimeDurationSeconds += $this->overlapSeconds($overtimeActiveAt, $timestamp, $rangeStart, $rangeEnd);
                        $overtimeActiveAt = null;
                    }

                    $normalActiveAt ??= $timestamp;
                    break;

                case 'break_out':
                    if ($normalActiveAt) {
                        $normalDurationSeconds += $this->overlapSeconds($normalActiveAt, $timestamp, $rangeStart, $rangeEnd);
                        $normalActiveAt = null;
                    }

                    if ($overtimeActiveAt) {
                        $overtimeDurationSeconds += $this->overlapSeconds($overtimeActiveAt, $timestamp, $rangeStart, $rangeEnd);
                        $overtimeActiveAt = null;
                    }
                    break;

                case 'overtime_in':
                    if ($normalActiveAt) {
                        $normalDurationSeconds += $this->overlapSeconds($normalActiveAt, $timestamp, $rangeStart, $rangeEnd);
                        $normalActiveAt = null;
                    }

                    $overtimeActiveAt ??= $timestamp;
                    break;

                case 'overtime_out':
                    if ($overtimeActiveAt) {
                        $overtimeDurationSeconds += $this->overlapSeconds($overtimeActiveAt, $timestamp, $rangeStart, $rangeEnd);
                        $overtimeActiveAt = null;
                    }
                    break;

                case 'check_out':
                    if ($normalActiveAt) {
                        $normalDurationSeconds += $this->overlapSeconds($normalActiveAt, $timestamp, $rangeStart, $rangeEnd);
                        $normalActiveAt = null;
                    }

                    if ($overtimeActiveAt) {
                        $overtimeDurationSeconds += $this->overlapSeconds($overtimeActiveAt, $timestamp, $rangeStart, $rangeEnd);
                        $overtimeActiveAt = null;
                    }
                    break;
            }
        }

        if ($normalActiveAt) {
            $normalDurationSeconds += $this->openSessionDurationSeconds($normalActiveAt, $rangeStart, $rangeEnd);
        }

        if ($overtimeActiveAt) {
            $overtimeDurationSeconds += $this->openSessionDurationSeconds($overtimeActiveAt, $rangeStart, $rangeEnd);
        }

        $totalDurationSeconds = $normalDurationSeconds + $overtimeDurationSeconds;

        return [
            'device_user_id' => $deviceUserId,
            'employee_name' => $employeeName,
            'from_date' => $rangeStart->toDateString(),
            'to_date' => $rangeEnd->toDateString(),
            'total_duration_seconds' => $totalDurationSeconds,
            'total_duration_human' => $this->formatDuration($totalDurationSeconds),
            'normal_duration_seconds' => $normalDurationSeconds,
            'normal_duration_human' => $this->formatDuration($normalDurationSeconds),
            'overtime_duration_seconds' => $overtimeDurationSeconds,
            'overtime_duration_human' => $this->formatDuration($overtimeDurationSeconds),
        ];
    }

    private function overlapSeconds(
        CarbonImmutable $intervalStart,
        CarbonImmutable $intervalEnd,
        CarbonImmutable $rangeStart,
        CarbonImmutable $rangeEnd,
    ): int {
        $start = $intervalStart->greaterThan($rangeStart) ? $intervalStart : $rangeStart;
        $end = $intervalEnd->lessThan($rangeEnd) ? $intervalEnd : $rangeEnd;

        if ($end->lessThanOrEqualTo($start)) {
            return 0;
        }

        return $start->diffInSeconds($end);
    }

    private function openSessionDurationSeconds(
        CarbonImmutable $startedAt,
        CarbonImmutable $rangeStart,
        CarbonImmutable $rangeEnd,
    ): int {
        if (! $startedAt->isSameDay(CarbonImmutable::now())) {
            return 0;
        }

        $effectiveEnd = CarbonImmutable::now()->lessThan($rangeEnd)
            ? CarbonImmutable::now()
            : $rangeEnd;

        return $this->overlapSeconds($startedAt, $effectiveEnd, $rangeStart, $rangeEnd);
    }

    private function expireActiveSessionFromPreviousDay(?CarbonImmutable &$activeAt, CarbonImmutable $timestamp): void
    {
        if ($activeAt && ! $activeAt->isSameDay($timestamp)) {
            $activeAt = null;
        }
    }

    private function formatDuration(int $seconds): string
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
}
