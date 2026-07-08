<?php

namespace Tests\Unit;

use App\Services\Attendance\AttendanceRecordMapper;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class AttendanceRecordMapperTest extends TestCase
{
    #[DataProvider('devicePayloadProvider')]
    public function test_it_maps_attendance_state_and_verification_from_configured_fields(
        array $payload,
        string $expectedState,
        string $expectedVerification,
    ): void {
        config()->set('attendance.device.attendance_state_field', 'auto');
        config()->set('attendance.device.verification_field', 'auto');

        $record = app(AttendanceRecordMapper::class)->fromDevicePayload($payload);

        $this->assertSame($expectedState, $record->state);
        $this->assertSame($expectedVerification, $record->verificationType);
    }

    public function test_it_falls_back_to_legacy_fields_when_type_is_not_a_valid_attendance_state(): void
    {
        config()->set('attendance.device.attendance_state_field', 'auto');
        config()->set('attendance.device.verification_field', 'auto');

        $record = app(AttendanceRecordMapper::class)->fromDevicePayload([
            'uid' => 25,
            'user_id' => 2,
            'state' => 0,
            'record_time' => '2026-07-08 18:26:22',
            'type' => 255,
        ]);

        $this->assertSame('check_in', $record->state);
        $this->assertSame('Unknown (255)', $record->verificationType);
    }

    public static function devicePayloadProvider(): array
    {
        return [
            'check in with fingerprint' => [
                [
                    'uid' => 28,
                    'user_id' => 2,
                    'state' => 1,
                    'record_time' => '2026-07-08 18:29:51',
                    'type' => 0,
                ],
                'check_in',
                'Fingerprint',
            ],
            'check out with fingerprint' => [
                [
                    'uid' => 29,
                    'user_id' => 2,
                    'state' => 1,
                    'record_time' => '2026-07-08 18:30:13',
                    'type' => 1,
                ],
                'check_out',
                'Fingerprint',
            ],
            'overtime in with fingerprint' => [
                [
                    'uid' => 31,
                    'user_id' => 2,
                    'state' => 1,
                    'record_time' => '2026-07-08 18:30:48',
                    'type' => 4,
                ],
                'overtime_in',
                'Fingerprint',
            ],
            'overtime out with fingerprint' => [
                [
                    'uid' => 30,
                    'user_id' => 2,
                    'state' => 1,
                    'record_time' => '2026-07-08 18:30:31',
                    'type' => 5,
                ],
                'overtime_out',
                'Fingerprint',
            ],
        ];
    }
}
