<?php

namespace App\Services\Attendance;

use App\Models\AttendanceLog;
use App\Models\ManualAttendanceEntry;
use App\Services\Attendance\DTO\AttendanceTimelineRecord;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class AttendanceTimelineService
{
    /**
     * @return Collection<int, AttendanceTimelineRecord>
     */
    public function recordsOnDate(CarbonImmutable $date): Collection
    {
        return $this->mergeAndNormalizeRecords(
            $this->deviceRecordsBetween($date->startOfDay(), $date->endOfDay()),
            $this->manualRecordsBetween($date->startOfDay(), $date->endOfDay()),
            descending: true,
        );
    }

    /**
     * @return Collection<int, AttendanceTimelineRecord>
     */
    public function recordsForUserBetween(string $deviceUserId, CarbonImmutable $rangeStart, CarbonImmutable $rangeEnd): Collection
    {
        return $this->mergeAndNormalizeRecords(
            $this->deviceRecordsBetween($rangeStart, $rangeEnd, $deviceUserId),
            $this->manualRecordsBetween($rangeStart, $rangeEnd, $deviceUserId),
            descending: false,
        );
    }

    /**
     * @return Collection<int, AttendanceTimelineRecord>
     */
    public function recordsBetween(CarbonImmutable $rangeStart, CarbonImmutable $rangeEnd): Collection
    {
        return $this->mergeAndNormalizeRecords(
            $this->deviceRecordsBetween($rangeStart, $rangeEnd),
            $this->manualRecordsBetween($rangeStart, $rangeEnd),
            descending: false,
        );
    }

    public function previousRecordForUserBefore(string $deviceUserId, CarbonImmutable $before): ?AttendanceTimelineRecord
    {
        $deviceRecords = AttendanceLog::query()
            ->trusted()
            ->where('device_user_id', $deviceUserId)
            ->where('timestamp', '<', $before)
            ->orderByDesc('timestamp')
            ->orderByDesc('id')
            ->limit(10)
            ->get()
            ->map(fn (AttendanceLog $record): AttendanceTimelineRecord => $this->mapDeviceRecord($record));

        $manualRecords = ManualAttendanceEntry::query()
            ->where('device_user_id', $deviceUserId)
            ->where('timestamp', '<', $before)
            ->orderByDesc('timestamp')
            ->orderByDesc('id')
            ->limit(10)
            ->get()
            ->map(fn (ManualAttendanceEntry $record): AttendanceTimelineRecord => $this->mapManualRecord($record));

        return $this->mergeAndNormalizeRecords($deviceRecords, $manualRecords, descending: true)->first();
    }

    public function stateLabel(string $state): string
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

    /**
     * @return Collection<int, AttendanceTimelineRecord>
     */
    private function deviceRecordsBetween(
        CarbonImmutable $rangeStart,
        CarbonImmutable $rangeEnd,
        ?string $deviceUserId = null,
    ): Collection {
        $query = AttendanceLog::query()
            ->trusted()
            ->whereBetween('timestamp', [$rangeStart, $rangeEnd]);

        if ($deviceUserId !== null) {
            $query->where('device_user_id', $deviceUserId);
        }

        return $query
            ->orderBy('timestamp')
            ->orderBy('id')
            ->get()
            ->map(fn (AttendanceLog $record): AttendanceTimelineRecord => $this->mapDeviceRecord($record));
    }

    /**
     * @return Collection<int, AttendanceTimelineRecord>
     */
    private function manualRecordsBetween(
        CarbonImmutable $rangeStart,
        CarbonImmutable $rangeEnd,
        ?string $deviceUserId = null,
    ): Collection {
        $query = ManualAttendanceEntry::query()
            ->whereBetween('timestamp', [$rangeStart, $rangeEnd]);

        if ($deviceUserId !== null) {
            $query->where('device_user_id', $deviceUserId);
        }

        return $query
            ->orderBy('timestamp')
            ->orderBy('id')
            ->get()
            ->map(fn (ManualAttendanceEntry $record): AttendanceTimelineRecord => $this->mapManualRecord($record));
    }

    /**
     * @param  Collection<int, AttendanceTimelineRecord>  $deviceRecords
     * @param  Collection<int, AttendanceTimelineRecord>  $manualRecords
     * @return Collection<int, AttendanceTimelineRecord>
     */
    private function mergeAndNormalizeRecords(
        Collection $deviceRecords,
        Collection $manualRecords,
        bool $descending,
    ): Collection {
        $records = $deviceRecords
            ->concat($manualRecords)
            ->sort(fn (AttendanceTimelineRecord $left, AttendanceTimelineRecord $right): int => $this->compareRecords(
                $left,
                $right,
                $descending,
            ))
            ->values();

        return $this->removeSupersededManualRecords($records, $descending);
    }

    /**
     * @param  Collection<int, AttendanceTimelineRecord>  $records
     * @return Collection<int, AttendanceTimelineRecord>
     */
    private function removeSupersededManualRecords(Collection $records, bool $descending): Collection
    {
        $duplicateWindowSeconds = max(0, (int) config('attendance.device.manual_duplicate_window_seconds', 900));
        $deviceRecords = $records
            ->filter(fn (AttendanceTimelineRecord $record): bool => $record->source === 'device')
            ->values();

        $filtered = $records->reject(function (AttendanceTimelineRecord $record) use ($deviceRecords, $duplicateWindowSeconds): bool {
            if ($record->source !== 'manual') {
                return false;
            }

            return $deviceRecords->contains(function (AttendanceTimelineRecord $deviceRecord) use ($record, $duplicateWindowSeconds): bool {
                if ($deviceRecord->deviceUserId !== $record->deviceUserId || $deviceRecord->state !== $record->state) {
                    return false;
                }

                return abs($deviceRecord->timestamp->getTimestamp() - $record->timestamp->getTimestamp()) <= $duplicateWindowSeconds;
            });
        });

        return $filtered
            ->sort(fn (AttendanceTimelineRecord $left, AttendanceTimelineRecord $right): int => $this->compareRecords(
                $left,
                $right,
                $descending,
            ))
            ->values();
    }

    private function compareRecords(AttendanceTimelineRecord $left, AttendanceTimelineRecord $right, bool $descending): int
    {
        $leftTimestamp = $left->timestamp->getTimestamp();
        $rightTimestamp = $right->timestamp->getTimestamp();

        if ($leftTimestamp !== $rightTimestamp) {
            return $descending
                ? $rightTimestamp <=> $leftTimestamp
                : $leftTimestamp <=> $rightTimestamp;
        }

        $sourcePriorityDifference = $left->sourcePriority() <=> $right->sourcePriority();

        if ($sourcePriorityDifference !== 0) {
            return $sourcePriorityDifference;
        }

        return $descending
            ? $right->id <=> $left->id
            : $left->id <=> $right->id;
    }

    private function mapDeviceRecord(AttendanceLog $record): AttendanceTimelineRecord
    {
        return new AttendanceTimelineRecord(
            id: $record->id,
            source: 'device',
            deviceUserId: $record->device_user_id,
            employeeName: $record->employee_name,
            timestamp: CarbonImmutable::instance($record->timestamp),
            state: $record->state,
            verificationType: $record->verification_type ?: 'Unknown',
        );
    }

    private function mapManualRecord(ManualAttendanceEntry $record): AttendanceTimelineRecord
    {
        return new AttendanceTimelineRecord(
            id: $record->id,
            source: 'manual',
            deviceUserId: $record->device_user_id,
            employeeName: $record->employee_name,
            timestamp: CarbonImmutable::instance($record->timestamp),
            state: $record->state,
            verificationType: $record->verification_type ?: 'Manual Entry',
            note: $record->note,
        );
    }
}
