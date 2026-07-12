<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Services\Attendance\AttendanceDashboardPayloadFactory;
use App\Services\Attendance\AttendanceLogSynchronizer;
use App\Services\Attendance\AttendanceRangeReportService;
use App\Services\Attendance\AttendanceRangeSummaryService;
use App\Services\Attendance\AttendanceTimelineService;
use App\Services\Attendance\AttendanceWorkingHoursService;
use App\Services\Attendance\ManualAttendanceManager;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function __construct(
        private readonly AttendanceDashboardPayloadFactory $payloadFactory,
        private readonly AttendanceRangeReportService $rangeReportService,
        private readonly AttendanceRangeSummaryService $rangeSummaryService,
        private readonly AttendanceTimelineService $timelineService,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $selectedDate = $this->resolveRequestedDate($request);

        return response()->json([
            'data' => $this->payloadFactory->make($selectedDate)['totals']['records'],
        ]);
    }

    public function today(Request $request): JsonResponse
    {
        return response()->json($this->payloadFactory->make($this->resolveRequestedDate($request))['totals']);
    }

    public function dashboard(Request $request, AttendanceLogSynchronizer $synchronizer): JsonResponse
    {
        $selectedDate = $this->resolveRequestedDate($request);
        if ($selectedDate->isToday()) {
            $synchronizer->triggerBackgroundSyncIfDue();
        }

        $payload = $this->payloadFactory->make($selectedDate);

        return response()->json($payload, 200, [
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }

    public function summary(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'device_user_id' => ['required', 'string'],
            'from_date' => ['required', 'date_format:Y-m-d'],
            'to_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:from_date'],
        ]);

        $fromDate = CarbonImmutable::createFromFormat('Y-m-d', $validated['from_date'], config('app.timezone'))->startOfDay();
        $toDate = CarbonImmutable::createFromFormat('Y-m-d', $validated['to_date'], config('app.timezone'))->startOfDay();

        return response()->json([
            'summary' => $this->rangeSummaryService->summarize(
                $validated['device_user_id'],
                $fromDate,
                $toDate,
            ),
        ]);
    }

    public function report(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'device_user_id' => ['required', 'string'],
            'from_date' => ['required', 'date_format:Y-m-d'],
            'to_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:from_date'],
        ]);

        $fromDate = CarbonImmutable::createFromFormat('Y-m-d', $validated['from_date'], config('app.timezone'))->startOfDay();
        $toDate = CarbonImmutable::createFromFormat('Y-m-d', $validated['to_date'], config('app.timezone'))->startOfDay();

        return response()->json(
            $this->rangeReportService->make(
                $validated['device_user_id'],
                $fromDate,
                $toDate,
            )
        );
    }

    public function monthlyStatisticsData(Request $request): JsonResponse
    {
        $selectedMonth = $this->resolveRequestedMonth($request);
        $records = $this->timelineService->recordsBetween($selectedMonth->startOfMonth(), $selectedMonth->endOfMonth());

        return response()->json([
            'month' => $selectedMonth->format('Y-m'),
            'employees' => Employee::query()
                ->orderBy('name')
                ->get(['device_user_id', 'name'])
                ->map(fn (Employee $employee): array => [
                    'device_user_id' => $employee->device_user_id,
                    'name' => $employee->name,
                ])
                ->values()
                ->all(),
            'records' => $records->map(fn ($record): array => $this->payloadFactory->serializeRecord($record))->values()->all(),
        ], 200, [
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }

    public function manualCheckIn(Request $request, ManualAttendanceManager $manualAttendanceManager): JsonResponse
    {
        $validated = $request->validate([
            'device_user_id' => ['required', 'string'],
            'attendance_date' => ['required', 'date_format:Y-m-d'],
            'attendance_time' => ['required', 'date_format:H:i'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $timestamp = CarbonImmutable::createFromFormat(
            'Y-m-d H:i',
            sprintf('%s %s', $validated['attendance_date'], $validated['attendance_time']),
            config('app.timezone')
        );

        $entry = $manualAttendanceManager->createManualCheckIn(
            $validated['device_user_id'],
            $timestamp,
            $validated['note'] ?? null,
        );

        return response()->json([
            'message' => 'Manual check-in saved successfully.',
            'entry' => [
                'id' => $entry->id,
                'device_user_id' => $entry->device_user_id,
                'employee_name' => $entry->employee_name,
                'timestamp' => $entry->timestamp?->toISOString(),
            ],
        ], 201);
    }

    public function manualCheckOut(Request $request, ManualAttendanceManager $manualAttendanceManager): JsonResponse
    {
        $validated = $request->validate([
            'device_user_id' => ['required', 'string'],
            'attendance_date' => ['required', 'date_format:Y-m-d'],
            'attendance_time' => ['required', 'date_format:H:i'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $timestamp = CarbonImmutable::createFromFormat(
            'Y-m-d H:i',
            sprintf('%s %s', $validated['attendance_date'], $validated['attendance_time']),
            config('app.timezone')
        );

        $entry = $manualAttendanceManager->createManualCheckOut(
            $validated['device_user_id'],
            $timestamp,
            $validated['note'] ?? null,
        );

        return response()->json([
            'message' => 'Manual check-out saved successfully.',
            'entry' => [
                'id' => $entry->id,
                'device_user_id' => $entry->device_user_id,
                'employee_name' => $entry->employee_name,
                'timestamp' => $entry->timestamp?->toISOString(),
            ],
        ], 201);
    }

    public function updateEmployeeWorkingHours(
        string $deviceUserId,
        Request $request,
        AttendanceWorkingHoursService $workingHoursService,
    ): JsonResponse {
        $validated = $request->validate([
            'work_start_time' => ['nullable', 'date_format:H:i'],
            'work_end_time' => ['nullable', 'date_format:H:i'],
        ]);

        $workStartTime = $validated['work_start_time'] ?? null;
        $workEndTime = $validated['work_end_time'] ?? null;

        if (($workStartTime === null) !== ($workEndTime === null)) {
            return response()->json([
                'message' => 'Both work start and work end times are required together.',
                'errors' => [
                    'work_start_time' => ['Both work start and work end times are required together.'],
                    'work_end_time' => ['Both work start and work end times are required together.'],
                ],
            ], 422);
        }

        if ($workStartTime !== null && $workEndTime !== null && $workEndTime <= $workStartTime) {
            return response()->json([
                'message' => 'The work end time must be after the work start time.',
                'errors' => [
                    'work_end_time' => ['The work end time must be after the work start time.'],
                ],
            ], 422);
        }

        $employee = Employee::query()
            ->where('device_user_id', $deviceUserId)
            ->firstOrFail();

        $employee->forceFill([
            'work_start_time' => $workStartTime,
            'work_end_time' => $workEndTime,
        ])->save();

        return response()->json([
            'message' => $workStartTime && $workEndTime
                ? 'Custom working hours saved successfully.'
                : 'Employee working hours reset to the default schedule.',
            'employee' => [
                'device_user_id' => $employee->device_user_id,
                'name' => $employee->name,
                'working_hours' => $workingHoursService->configurationForEmployee($employee),
                'has_custom_working_hours' => $employee->work_start_time !== null && $employee->work_end_time !== null,
            ],
        ]);
    }

    private function resolveRequestedDate(Request $request): CarbonImmutable
    {
        $validated = $request->validate([
            'date' => ['nullable', 'date_format:Y-m-d'],
        ]);

        if (! isset($validated['date'])) {
            return CarbonImmutable::now();
        }

        return CarbonImmutable::createFromFormat('Y-m-d', $validated['date'], config('app.timezone'))
            ->startOfDay();
    }

    private function resolveRequestedMonth(Request $request): CarbonImmutable
    {
        $validated = $request->validate([
            'month' => ['nullable', 'date_format:Y-m'],
        ]);

        if (! isset($validated['month'])) {
            return CarbonImmutable::now()->startOfMonth();
        }

        return CarbonImmutable::createFromFormat('Y-m', $validated['month'], config('app.timezone'))
            ->startOfMonth();
    }
}
