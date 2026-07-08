<?php

namespace App\Services\Attendance;

use App\Services\Attendance\DTO\AttendanceRecord;
use Carbon\CarbonImmutable;

class AttendanceRecordMapper
{
    /**
     * @param array<string, mixed> $record
     */
    public function fromDevicePayload(array $record): AttendanceRecord
    {
        $timestamp = CarbonImmutable::parse((string) ($record['record_time'] ?? $record['timestamp'] ?? now()));

        return new AttendanceRecord(
            deviceUserId: (string) ($record['user_id'] ?? $record['uid'] ?? ''),
            employeeName: null,
            timestamp: $timestamp,
            state: $this->mapState($this->extractAttendanceStateCode($record)),
            verificationType: $this->mapVerificationType($this->extractVerificationCode($record)),
            rawData: $record,
        );
    }

    /**
     * @param array<string, mixed> $record
     */
    private function extractAttendanceStateCode(array $record): mixed
    {
        if ($this->shouldUseSwappedFields($record)) {
            return $record['type'] ?? null;
        }

        return $this->recordValue(
            $record,
            (string) config('attendance.device.attendance_state_field', 'auto'),
            ['state', 'type'],
        );
    }

    /**
     * @param array<string, mixed> $record
     */
    private function extractVerificationCode(array $record): mixed
    {
        if ($this->shouldUseSwappedFields($record)) {
            return $record['state'] ?? $record['verification_type'] ?? null;
        }

        return $this->recordValue(
            $record,
            (string) config('attendance.device.verification_field', 'auto'),
            ['verification_type', 'type', 'state'],
        );
    }

    /**
     * @param array<string, mixed> $record
     * @param array<int, string> $fallbacks
     */
    private function recordValue(array $record, string $primary, array $fallbacks): mixed
    {
        if ($primary === 'auto') {
            $primary = $fallbacks[0] ?? '';
        }

        $candidates = array_values(array_unique([$primary, ...$fallbacks]));

        foreach ($candidates as $field) {
            if (array_key_exists($field, $record)) {
                return $record[$field];
            }
        }

        return null;
    }

    /**
     * Some ZKTeco devices write attendance status into `type` and verification mode into `state`.
     *
     * @param array<string, mixed> $record
     */
    private function shouldUseSwappedFields(array $record): bool
    {
        $stateField = (string) config('attendance.device.attendance_state_field', 'auto');
        $verificationField = (string) config('attendance.device.verification_field', 'auto');

        if ($stateField !== 'auto' || $verificationField !== 'auto') {
            return false;
        }

        return $this->isAttendanceStateCode($record['type'] ?? null)
            && $this->isVerificationCode($record['state'] ?? null);
    }

    private function isAttendanceStateCode(mixed $value): bool
    {
        return in_array((string) $value, ['0', '1', '2', '3', '4', '5'], true);
    }

    private function isVerificationCode(mixed $value): bool
    {
        return in_array((string) $value, ['0', '1', '2', '3', '4', '15'], true);
    }

    private function mapState(mixed $state): string
    {
        return match ((string) $state) {
            '0' => 'check_in',
            '1' => 'check_out',
            '2' => 'break_out',
            '3' => 'break_in',
            '4' => 'overtime_in',
            '5' => 'overtime_out',
            default => 'unknown',
        };
    }

    private function mapVerificationType(mixed $type): string
    {
        return match ((string) $type) {
            '0' => 'Password',
            '1' => 'Fingerprint',
            '2' => 'Card',
            '3' => 'Password + Fingerprint',
            '4' => 'Card + Fingerprint',
            '15' => 'Face',
            '' => 'Unknown',
            default => "Unknown ({$type})",
        };
    }
}
