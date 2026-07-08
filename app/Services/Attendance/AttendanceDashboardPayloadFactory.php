<?php

namespace App\Services\Attendance;

use App\Models\AttendanceLog;
use App\Services\Attendance\Contracts\AttendanceDeviceClient;
use Illuminate\Support\Facades\Cache;

class AttendanceDashboardPayloadFactory
{
    public function __construct(
        private readonly AttendanceDeviceClient $device,
    ) {
    }

    /**
     * @return array{
     *     totals: array{
     *         total_check_ins: int,
     *         total_check_outs: int,
     *         total_records: int,
     *         last_activity: ?string,
     *         last_sync_at: ?string,
     *         records: array<int, array<string, mixed>>
     *     },
     *     status: array{online: bool, device_time: ?string, firmware_version: ?string, error: ?string}
     * }
     */
    public function make(): array
    {
        $records = AttendanceLog::today()
            ->latest('timestamp')
            ->get();

        return [
            'totals' => [
                'total_check_ins' => $records->where('state', 'check_in')->count(),
                'total_check_outs' => $records->where('state', 'check_out')->count(),
                'total_records' => $records->count(),
                'last_activity' => $records->first()?->timestamp?->toISOString(),
                'last_sync_at' => Cache::get('attendance.last_sync_at'),
                'records' => $records->map(fn (AttendanceLog $log): array => $this->serializeLog($log))->values()->all(),
            ],
            'status' => $this->device->status()->toArray(),
        ];
    }

    /**
     * @return array{
     *     id: int,
     *     device_user_id: string,
     *     employee_name: string,
     *     timestamp: ?string,
     *     time: ?string,
     *     state: string,
     *     state_label: string,
     *     verification_type: string
     * }
     */
    public function serializeLog(AttendanceLog $log): array
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
