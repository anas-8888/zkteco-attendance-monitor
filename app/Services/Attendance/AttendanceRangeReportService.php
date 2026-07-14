<?php

namespace App\Services\Attendance;

use App\Models\Employee;
use App\Services\Attendance\DTO\AttendanceTimelineRecord;
use Carbon\CarbonImmutable;

class AttendanceRangeReportService
{
    public function __construct(
        private readonly AttendanceTimelineService $timelineService,
        private readonly AttendanceRangeSummaryService $rangeSummaryService,
        private readonly AttendanceWorkingHoursService $workingHoursService,
    ) {
    }

    /**
     * @return array{
     *     employee: array{device_user_id: string, name: string},
     *     from_date: string,
     *     to_date: string,
     *     working_hours: array{start_time: string, end_time: string},
     *     summary: array<string, mixed>,
     *     totals: array{record_count: int, session_count: int, completed_session_count: int},
     *     sessions: array<int, array<string, mixed>>,
     *     records: array<int, array<string, mixed>>
     * }
     */
    public function make(string $deviceUserId, CarbonImmutable $fromDate, CarbonImmutable $toDate): array
    {
        $rangeStart = $fromDate->startOfDay();
        $rangeEnd = $toDate->endOfDay();
        $employee = Employee::query()->where('device_user_id', $deviceUserId)->first();

        $records = $this->timelineService->recordsForUserBetween($deviceUserId, $rangeStart, $rangeEnd);
        $recordDates = [];

        foreach ($records as $record) {
            $recordDates[$record->timestamp->toDateString()] = true;
        }

        $summary = $this->rangeSummaryService->summarize($deviceUserId, $fromDate, $toDate);
        $employeeName = $summary['employee_name']
            ?? $employee?->name
            ?? $deviceUserId;

        $attendanceSession = null;
        $overtimeSession = null;
        $sessions = [];

        foreach ($records as $record) {
            $timestamp = $record->timestamp;
            $method = $record->verificationType ?: 'Unknown';
            $this->expireSessionsFromPreviousDays($attendanceSession, $overtimeSession, $timestamp, $employee, $sessions);

            switch ($record->state) {
                case 'check_in':
                case 'break_in':
                    if ($overtimeSession) {
                        $sessions[] = $this->closeSession($overtimeSession, $timestamp, $employee);
                        $overtimeSession = null;
                    }

                    if ($attendanceSession) {
                        // Preserve the first attendance start so duplicate punches
                        // or break returns do not create false late penalties.
                        break;
                    }

                    $attendanceSession = $this->startSession(
                        'attendance',
                        $timestamp,
                        $method,
                        $record->state === 'check_in',
                    );
                    break;

                case 'overtime_in':
                    if ($attendanceSession) {
                        $sessions[] = $this->closeSession($attendanceSession, $timestamp, $employee);
                        $attendanceSession = null;
                    }

                    if ($overtimeSession) {
                        break;
                    }

                    $overtimeSession = $this->startSession('overtime', $timestamp, $method);
                    break;

                case 'check_out':
                case 'break_out':
                    if ($attendanceSession) {
                        $sessions[] = $this->closeSession($attendanceSession, $timestamp, $employee);
                        $attendanceSession = null;
                    }

                    if ($overtimeSession) {
                        $sessions[] = $this->closeSession($overtimeSession, $timestamp, $employee);
                        $overtimeSession = null;
                    }
                    break;

                case 'overtime_out':
                    if ($overtimeSession) {
                        $sessions[] = $this->closeSession($overtimeSession, $timestamp, $employee);
                        $overtimeSession = null;
                    }
                    break;
            }
        }

        if ($attendanceSession) {
            $sessions[] = $this->leaveSessionOpen($attendanceSession, $employee);
        }

        if ($overtimeSession) {
            $sessions[] = $this->leaveSessionOpen($overtimeSession, $employee);
        }

        foreach ($this->buildAbsentSessions($fromDate, $toDate, $recordDates, $employee) as $absentSession) {
            $sessions[] = $absentSession;
        }

        usort($sessions, static fn (array $left, array $right): int => strcmp($right['started_at_iso'], $left['started_at_iso']));
        $totalLateSeconds = array_reduce(
            $sessions,
            static fn (int $carry, array $session): int => $carry + max((int) ($session['late_seconds'] ?? 0), 0),
            0,
        );
        $summary['late_duration_seconds'] = $totalLateSeconds;
        $summary['late_duration_human'] = $this->formatDuration($totalLateSeconds);

        return [
            'employee' => [
                'device_user_id' => $deviceUserId,
                'name' => $employeeName,
            ],
            'from_date' => $rangeStart->toDateString(),
            'to_date' => $rangeEnd->toDateString(),
            'working_hours' => $this->workingHoursService->configurationForEmployee($employee),
            'summary' => $summary,
            'totals' => [
                'record_count' => $records->count(),
                'session_count' => count($sessions),
                'completed_session_count' => count(array_filter($sessions, static fn (array $session): bool => $session['check_out_time'] !== null)),
            ],
            'sessions' => array_values($sessions),
            'records' => $records->map(fn (AttendanceTimelineRecord $record): array => $this->serializeRecord($record))->values()->all(),
        ];
    }

    /**
     * @return array{
     *     id: int,
     *     attendance_date: ?string,
     *     time: ?string,
     *     state: string,
     *     state_label: string,
     *     method: string
     * }
     */
    private function serializeRecord(AttendanceTimelineRecord $record): array
    {
        return [
            'id' => $record->id,
            'attendance_date' => $record->timestamp->toDateString(),
            'time' => $record->timestamp->format('H:i:s'),
            'state' => $record->state,
            'state_label' => $this->timelineService->stateLabel($record->state),
            'method' => $record->verificationType ?: 'Unknown',
        ];
    }

    /**
     * @return array{
     *     session_type: string,
     *     session_type_label: string,
     *     counts_for_late: bool,
     *     attendance_date: string,
     *     check_in_time: string,
     *     check_out_time: ?string,
     *     method: string,
     *     duration_seconds: ?int,
     *     duration_human: string,
     *     late_seconds: ?int,
     *     late_human: string,
     *     is_in_progress: bool,
     *     started_at_iso: string,
     *     started_at: CarbonImmutable
     * }
     */
    private function startSession(string $type, CarbonImmutable $startedAt, string $method, bool $countsForLate = true): array
    {
        return [
            'session_type' => $type,
            'session_type_label' => $type === 'overtime' ? 'Overtime' : 'Attendance',
            'counts_for_late' => $countsForLate,
            'attendance_date' => $startedAt->toDateString(),
            'check_in_time' => $startedAt->format('H:i:s'),
            'check_out_time' => null,
            'method' => $method,
            'duration_seconds' => null,
            'duration_human' => '--',
            'late_seconds' => null,
            'late_human' => '--',
            'is_in_progress' => false,
            'started_at_iso' => $startedAt->toISOString(),
            'started_at' => $startedAt,
        ];
    }

    /**
     * @param  ?array<string, mixed>  $attendanceSession
     * @param  ?array<string, mixed>  $overtimeSession
     * @param  array<int, array<string, mixed>>  $sessions
     */
    private function expireSessionsFromPreviousDays(
        ?array &$attendanceSession,
        ?array &$overtimeSession,
        CarbonImmutable $timestamp,
        ?Employee $employee,
        array &$sessions,
    ): void {
        if ($attendanceSession && ! $this->sessionStartedOnSameDay($attendanceSession, $timestamp)) {
            $sessions[] = $this->leaveSessionOpen($attendanceSession, $employee);
            $attendanceSession = null;
        }

        if ($overtimeSession && ! $this->sessionStartedOnSameDay($overtimeSession, $timestamp)) {
            $sessions[] = $this->leaveSessionOpen($overtimeSession, $employee);
            $overtimeSession = null;
        }
    }

    /**
     * @param  array<string, mixed>  $session
     */
    private function sessionStartedOnSameDay(array $session, CarbonImmutable $timestamp): bool
    {
        /** @var CarbonImmutable $startedAt */
        $startedAt = $session['started_at'];

        return $startedAt->isSameDay($timestamp);
    }

    /**
     * @param  array<string, mixed>  $session
     * @return array<string, mixed>
     */
    private function closeSession(array $session, CarbonImmutable $endedAt, ?Employee $employee = null): array
    {
        /** @var CarbonImmutable $startedAt */
        $startedAt = $session['started_at'];
        $seconds = max($startedAt->diffInSeconds($endedAt), 0);
        $late = $session['session_type'] === 'attendance' && ($session['counts_for_late'] ?? false)
            ? $this->workingHoursService->lateForAttendanceSession(
                $startedAt,
                $endedAt,
                $startedAt,
                $employee,
            )
            : ['late_seconds' => null, 'late_human' => '--'];

        unset($session['started_at']);

        return [
            ...$session,
            'check_out_time' => $endedAt->format('H:i:s'),
            'duration_seconds' => $seconds,
            'duration_human' => $this->formatDuration($seconds),
            'late_seconds' => $late['late_seconds'],
            'late_human' => $late['late_human'],
        ];
    }

    /**
     * @param  array<string, mixed>  $session
     * @return array<string, mixed>
     */
    private function leaveSessionOpen(array $session, ?Employee $employee = null): array
    {
        /** @var CarbonImmutable $startedAt */
        $startedAt = $session['started_at'];
        $now = CarbonImmutable::now(config('app.timezone'));
        $isInProgress = $startedAt->isSameDay($now);
        $late = $session['session_type'] === 'attendance' && ($session['counts_for_late'] ?? false)
            ? $this->workingHoursService->lateForAttendanceSession(
                $startedAt,
                null,
                $startedAt,
                $employee,
            )
            : ['late_seconds' => null, 'late_human' => '--'];
        $durationSeconds = $isInProgress
            ? max($startedAt->diffInSeconds($now), 0)
            : null;

        unset($session['started_at']);

        return [
            ...$session,
            'duration_seconds' => $durationSeconds,
            'duration_human' => $durationSeconds !== null ? $this->formatDuration($durationSeconds) : '--',
            'late_seconds' => $late['late_seconds'],
            'late_human' => $late['late_human'],
            'is_in_progress' => $isInProgress,
        ];
    }

    /**
     * @param  array<string, bool>  $recordDates
     * @return array<int, array<string, mixed>>
     */
    private function buildAbsentSessions(
        CarbonImmutable $fromDate,
        CarbonImmutable $toDate,
        array $recordDates,
        ?Employee $employee = null,
    ): array {
        $sessions = [];
        $cursor = $fromDate->startOfDay();
        $lastDate = $toDate->startOfDay();

        while ($cursor->lessThanOrEqualTo($lastDate)) {
            if (! isset($recordDates[$cursor->toDateString()]) && $this->shouldMarkAsAbsent($cursor, $employee)) {
                $sessions[] = $this->absentSessionForDate($cursor, $employee);
            }

            $cursor = $cursor->addDay();
        }

        return $sessions;
    }

    private function shouldMarkAsAbsent(CarbonImmutable $date, ?Employee $employee = null): bool
    {
        if ($this->workingHoursService->isOffDay($date, $employee)) {
            return false;
        }

        $today = CarbonImmutable::now(config('app.timezone'))->startOfDay();

        if ($date->lessThan($today)) {
            return true;
        }

        if ($date->greaterThan($today)) {
            return false;
        }

        $scheduledWindow = $this->workingHoursService->scheduledWorkWindowForDate($date, $employee);

        return CarbonImmutable::now(config('app.timezone'))->greaterThanOrEqualTo($scheduledWindow['end_at']);
    }

    /**
     * @return array<string, mixed>
     */
    private function absentSessionForDate(CarbonImmutable $attendanceDate, ?Employee $employee = null): array
    {
        $late = $this->workingHoursService->lateForAbsentDay($attendanceDate, $employee);

        return [
            'session_type' => 'absence',
            'session_type_label' => 'Absent',
            'counts_for_late' => true,
            'attendance_date' => $attendanceDate->toDateString(),
            'check_in_time' => null,
            'check_out_time' => null,
            'method' => 'No punches',
            'duration_seconds' => 0,
            'duration_human' => '0m',
            'late_seconds' => $late['late_seconds'],
            'late_human' => $late['late_human'],
            'is_in_progress' => false,
            'is_absent' => true,
            'started_at_iso' => $attendanceDate->startOfDay()->toISOString(),
        ];
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
