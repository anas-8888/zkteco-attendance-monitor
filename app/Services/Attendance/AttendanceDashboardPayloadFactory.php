<?php

namespace App\Services\Attendance;

use App\Models\Employee;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;

class AttendanceDashboardPayloadFactory
{
    public function __construct(
        private readonly AttendanceTimelineService $timelineService,
        private readonly AttendanceWorkingHoursService $workingHoursService,
    ) {
    }

    /**
     * @return array{
     *     totals: array{
     *         selected_date: string,
     *         total_check_ins: int,
     *         total_check_outs: int,
     *         total_records: int,
     *         last_activity: ?string,
     *         last_sync_at: ?string,
     *         records: array<int, array<string, mixed>>
     *     },
     *     working_hours: array{start_time: string, end_time: string},
     *     employees: array<int, array{device_user_id: string, name: string}>,
     *     status: array{online: bool, device_time: ?string, firmware_version: ?string, error: ?string}
     * }
     */
    public function make(?CarbonImmutable $date = null): array
    {
        $selectedDate = ($date ?? CarbonImmutable::now())->startOfDay();

        return $this->makeRange($selectedDate, $selectedDate);
    }

    /**
     * @return array{
     *     totals: array{
     *         selected_date: string,
     *         from_date: string,
     *         to_date: string,
     *         total_check_ins: int,
     *         total_check_outs: int,
     *         total_records: int,
     *         last_activity: ?string,
     *         last_sync_at: ?string,
     *         records: array<int, array<string, mixed>>
     *     },
     *     working_hours: array{start_time: string, end_time: string},
     *     employees: array<int, array{device_user_id: string, name: string}>,
     *     status: array{online: bool, device_time: ?string, firmware_version: ?string, error: ?string}
     * }
     */
    public function makeRange(CarbonImmutable $fromDate, CarbonImmutable $toDate): array
    {
        $rangeStart = $fromDate->startOfDay();
        $rangeEnd = $toDate->endOfDay();

        $records = $rangeStart->isSameDay($rangeEnd)
            ? $this->timelineService->recordsOnDate($rangeStart)
            : $this->timelineService->recordsBetween($rangeStart, $rangeEnd);

        return [
            'totals' => [
                'selected_date' => $rangeStart->toDateString(),
                'from_date' => $rangeStart->toDateString(),
                'to_date' => $rangeEnd->toDateString(),
                'total_check_ins' => $records->where('state', 'check_in')->count(),
                'total_check_outs' => $records->where('state', 'check_out')->count(),
                'total_records' => $records->count(),
                'last_activity' => $records->first()?->timestamp->toISOString(),
                'last_sync_at' => Cache::get('attendance.last_sync_at'),
                'records' => $records->map(fn ($record): array => $this->serializeRecord($record))->values()->all(),
            ],
            'working_hours' => $this->workingHoursService->configuration(),
            'employees' => Employee::query()
                ->orderBy('name')
                ->get(['device_user_id', 'name', 'work_start_time', 'work_end_time'])
                ->map(fn (Employee $employee): array => [
                    'device_user_id' => $employee->device_user_id,
                    'name' => $employee->name,
                    'working_hours' => $this->workingHoursService->configurationForEmployee($employee),
                ])
                ->values()
                ->all(),
            'status' => Cache::get('attendance.device_status', [
                'online' => false,
                'device_time' => null,
                'firmware_version' => null,
                'error' => null,
            ]),
        ];
    }

    /**
     * @param  \App\Services\Attendance\DTO\AttendanceTimelineRecord  $record
     * @return array{id: int, device_user_id: string, employee_name: string, timestamp: string, time: string, state: string, state_label: string, verification_type: string, source: string, note: ?string}
     */
    public function serializeRecord($record): array
    {
        return [
            'id' => $record->id,
            'device_user_id' => $record->deviceUserId,
            'employee_name' => $record->employeeName,
            'timestamp' => $record->timestamp->toISOString(),
            'time' => $record->timestamp->format('H:i:s'),
            'state' => $record->state,
            'state_label' => $this->timelineService->stateLabel($record->state),
            'verification_type' => $record->verificationType,
            'source' => $record->source,
            'note' => $record->note,
        ];
    }
}
