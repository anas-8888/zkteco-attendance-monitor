<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class AttendanceController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => AttendanceLog::today()
                ->latest('timestamp')
                ->get()
                ->map(fn (AttendanceLog $log): array => $this->serializeLog($log)),
        ]);
    }

    public function today(): JsonResponse
    {
        $records = AttendanceLog::today()
            ->latest('timestamp')
            ->get();

        return response()->json([
            'total_check_ins' => $records->where('state', 'check_in')->count(),
            'total_check_outs' => $records->where('state', 'check_out')->count(),
            'total_records' => $records->count(),
            'last_activity' => $records->first()?->timestamp?->toISOString(),
            'last_sync_at' => Cache::get('attendance.last_sync_at'),
            'records' => $records->map(fn (AttendanceLog $log): array => $this->serializeLog($log))->values(),
        ]);
    }

    private function serializeLog(AttendanceLog $log): array
    {
        return [
            'id' => $log->id,
            'device_user_id' => $log->device_user_id,
            'employee_name' => $log->employee_name,
            'timestamp' => $log->timestamp?->toISOString(),
            'time' => $log->timestamp?->format('H:i:s'),
            'state' => $log->state,
            'state_label' => $this->stateLabel($log->state),
            'verification_type' => $log->verification_type,
        ];
    }

    private function stateLabel(string $state): string
    {
        return match ($state) {
            'check_in' => 'Check In',
            'check_out' => 'Check Out',
            'break_out' => 'Break Out',
            'break_in' => 'Break In',
            'overtime_in' => 'Overtime In',
            'overtime_out' => 'Overtime Out',
            default => 'Unknown',
        };
    }
}
