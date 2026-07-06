<?php

namespace Tests\Feature;

use App\Models\AttendanceLog;
use App\Services\Attendance\AttendanceLogSynchronizer;
use App\Services\Attendance\Contracts\AttendanceDeviceClient;
use App\Services\Attendance\DTO\AttendanceRecord;
use App\Services\Attendance\DTO\DeviceStatus;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttendanceMonitoringTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();

        parent::tearDown();
    }

    public function test_sync_stores_only_new_attendance_logs(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-07-06 09:30:00'));

        $this->app->bind(AttendanceDeviceClient::class, fn (): AttendanceDeviceClient => new class implements AttendanceDeviceClient
        {
            public function usersByDeviceId(): array
            {
                return ['42' => 'Maya Haddad'];
            }

            public function attendanceRecords(): array
            {
                $checkIn = new AttendanceRecord(
                    deviceUserId: '42',
                    employeeName: null,
                    timestamp: CarbonImmutable::parse('2026-07-06 08:02:00'),
                    state: 'check_in',
                    verificationType: 'Fingerprint',
                    rawData: ['uid' => 42, 'state' => 0],
                );

                return [
                    $checkIn,
                    $checkIn,
                    new AttendanceRecord(
                        deviceUserId: '42',
                        employeeName: null,
                        timestamp: CarbonImmutable::parse('2026-07-06 17:04:00'),
                        state: 'check_out',
                        verificationType: 'Fingerprint',
                        rawData: ['uid' => 42, 'state' => 1],
                    ),
                ];
            }

            public function status(): DeviceStatus
            {
                return new DeviceStatus(true, '2026-07-06 09:30:00', 'K40');
            }
        });

        $firstRun = $this->app->make(AttendanceLogSynchronizer::class)->sync();
        $secondRun = $this->app->make(AttendanceLogSynchronizer::class)->sync();

        $this->assertSame(['fetched' => 3, 'inserted' => 2, 'skipped' => 1], $firstRun);
        $this->assertSame(['fetched' => 3, 'inserted' => 0, 'skipped' => 3], $secondRun);
        $this->assertSame(2, AttendanceLog::count());
    }

    public function test_today_endpoint_returns_monitoring_summary(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-07-06 09:30:00'));

        AttendanceLog::create([
            'device_user_id' => '42',
            'employee_name' => 'Maya Haddad',
            'timestamp' => '2026-07-06 08:02:00',
            'state' => 'check_in',
            'verification_type' => 'Fingerprint',
            'raw_data' => ['uid' => 42],
        ]);

        $this->getJson('/api/attendance/today')
            ->assertOk()
            ->assertJsonPath('total_check_ins', 1)
            ->assertJsonPath('total_check_outs', 0)
            ->assertJsonPath('total_records', 1)
            ->assertJsonPath('records.0.employee_name', 'Maya Haddad')
            ->assertJsonPath('records.0.state_label', 'Check In');
    }
}
