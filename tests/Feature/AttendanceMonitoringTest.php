<?php

namespace Tests\Feature;

use App\Models\AttendanceLog;
use App\Models\Employee;
use App\Services\Attendance\AttendanceLogSynchronizer;
use App\Services\Attendance\Contracts\AttendanceDeviceClient;
use App\Services\Attendance\DTO\AttendanceRecord;
use App\Services\Attendance\DTO\DeviceStatus;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Tests\TestCase;

class AttendanceMonitoringTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('attendance.schedule.off_days', '6');

        $user = $this->createInitializedAdministrator();

        $this->withSession([
            'auth_user_id' => $user->id,
        ]);
    }

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

    public function test_dashboard_endpoint_emits_live_dashboard_payload(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-07-06 09:30:00'));

        Employee::create([
            'device_user_id' => '42',
            'name' => 'Maya Haddad',
        ]);

        AttendanceLog::create([
            'device_user_id' => '42',
            'employee_name' => 'Maya Haddad',
            'timestamp' => '2026-07-06 08:02:00',
            'state' => 'check_in',
            'verification_type' => 'Fingerprint',
            'raw_data' => ['uid' => 42],
        ]);

        $this->app->bind(AttendanceDeviceClient::class, fn (): AttendanceDeviceClient => new class implements AttendanceDeviceClient
        {
            public function usersByDeviceId(): array
            {
                return ['42' => 'Maya Haddad'];
            }

            public function attendanceRecords(): array
            {
                return [];
            }

            public function status(): DeviceStatus
            {
                return new DeviceStatus(true, '2026-07-06 09:30:00', 'K40');
            }
        });

        Cache::put('attendance.device_status', [
            'online' => true,
            'device_time' => '2026-07-06 09:30:00',
            'firmware_version' => 'K40',
            'error' => null,
        ]);

        $response = $this->getJson('/api/attendance/dashboard');

        $response->assertOk();
        $response->assertJsonPath('totals.total_check_ins', 1);
        $response->assertJsonPath('employees.0.name', 'Maya Haddad');
        $response->assertJsonPath('status.online', true);
        $response->assertJsonPath('working_hours.start_time', '10:00');
        $response->assertJsonPath('working_hours.end_time', '18:00');
    }

    public function test_dashboard_endpoint_uses_cached_device_status_without_querying_the_device(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-07-06 09:30:00'));

        Cache::put('attendance.device_status', [
            'online' => true,
            'device_time' => '2026-07-06 09:30:00',
            'firmware_version' => 'K40',
            'error' => null,
        ]);

        $this->app->bind(AttendanceDeviceClient::class, fn (): AttendanceDeviceClient => new class implements AttendanceDeviceClient
        {
            public function usersByDeviceId(): array
            {
                throw new \RuntimeException('The dashboard should not fetch users directly from the device.');
            }

            public function attendanceRecords(): array
            {
                throw new \RuntimeException('The dashboard should not fetch attendance records directly from the device.');
            }

            public function status(): DeviceStatus
            {
                throw new \RuntimeException('The dashboard should not query device status directly.');
            }
        });

        $this->getJson('/api/attendance/dashboard?date=2026-07-05')
            ->assertOk()
            ->assertJsonPath('status.online', true)
            ->assertJsonPath('status.firmware_version', 'K40');
    }

    public function test_dashboard_endpoint_can_return_a_previous_day(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-07-06 09:30:00'));

        AttendanceLog::create([
            'device_user_id' => '42',
            'employee_name' => 'Maya Haddad',
            'timestamp' => '2026-07-05 08:02:00',
            'state' => 'check_in',
            'verification_type' => 'Fingerprint',
            'raw_data' => ['uid' => 42],
        ]);

        AttendanceLog::create([
            'device_user_id' => '42',
            'employee_name' => 'Maya Haddad',
            'timestamp' => '2026-07-06 08:02:00',
            'state' => 'check_in',
            'verification_type' => 'Fingerprint',
            'raw_data' => ['uid' => 42],
        ]);

        $this->app->bind(AttendanceDeviceClient::class, fn (): AttendanceDeviceClient => new class implements AttendanceDeviceClient
        {
            public function usersByDeviceId(): array
            {
                return ['42' => 'Maya Haddad'];
            }

            public function attendanceRecords(): array
            {
                return [];
            }

            public function status(): DeviceStatus
            {
                return new DeviceStatus(true, '2026-07-06 09:30:00', 'K40');
            }
        });

        $this->getJson('/api/attendance/dashboard?date=2026-07-05')
            ->assertOk()
            ->assertJsonPath('totals.selected_date', '2026-07-05')
            ->assertJsonPath('totals.total_records', 1)
            ->assertJsonPath('totals.records.0.timestamp', '2026-07-05T08:02:00.000000Z');
    }

    public function test_dashboard_endpoint_can_return_a_date_range(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-07-06 09:30:00'));

        AttendanceLog::create([
            'device_user_id' => '42',
            'employee_name' => 'Maya Haddad',
            'timestamp' => '2026-07-05 08:02:00',
            'state' => 'check_in',
            'verification_type' => 'Fingerprint',
            'raw_data' => ['uid' => 42],
        ]);

        AttendanceLog::create([
            'device_user_id' => '42',
            'employee_name' => 'Maya Haddad',
            'timestamp' => '2026-07-06 17:04:00',
            'state' => 'check_out',
            'verification_type' => 'Fingerprint',
            'raw_data' => ['uid' => 42],
        ]);

        $this->getJson('/api/attendance/dashboard?from_date=2026-07-05&to_date=2026-07-06')
            ->assertOk()
            ->assertJsonPath('totals.from_date', '2026-07-05')
            ->assertJsonPath('totals.to_date', '2026-07-06')
            ->assertJsonPath('totals.total_records', 2)
            ->assertJsonPath('totals.total_check_ins', 1)
            ->assertJsonPath('totals.total_check_outs', 1);
    }

    public function test_employees_page_lists_employees_and_view_links_to_reports(): void
    {
        Employee::create([
            'device_user_id' => '42',
            'name' => 'Maya Haddad',
        ]);

        $this->get('/employees')
            ->assertOk()
            ->assertSee('Employee Directory')
            ->assertSee('Maya Haddad')
            ->assertSee('/reports?employee_id=42', false);
    }

    public function test_reports_page_shows_employee_selector_and_custom_hours_action(): void
    {
        Employee::create([
            'device_user_id' => '42',
            'name' => 'Maya Haddad',
        ]);

        $this->get('/reports')
            ->assertOk()
            ->assertSee('All employees')
            ->assertSee('Maya Haddad (42)')
            ->assertSee('Customize Employee Hours')
            ->assertSee('Default work hours are changed from Settings. Custom employee hours apply when one employee is selected.')
            ->assertDontSee('Browse Employees')
            ->assertDontSee('Back To All Employees')
            ->assertDontSee('Edit Default Hours');
    }

    public function test_dashboard_force_sync_returns_newly_synced_records_even_when_polling_interval_has_not_elapsed(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-07-06 09:30:00'));

        config()->set('attendance.device.polling_interval', 60);

        Cache::put('attendance.last_sync_attempt_at', now()->subSeconds(10)->toISOString());

        $this->app->bind(AttendanceDeviceClient::class, fn (): AttendanceDeviceClient => new class implements AttendanceDeviceClient
        {
            public function usersByDeviceId(): array
            {
                return ['42' => 'Maya Haddad'];
            }

            public function attendanceRecords(): array
            {
                return [
                    new AttendanceRecord(
                        deviceUserId: '42',
                        employeeName: null,
                        timestamp: CarbonImmutable::parse('2026-07-06 09:25:00'),
                        state: 'check_in',
                        verificationType: 'Fingerprint',
                        rawData: ['uid' => 42, 'state' => 0],
                    ),
                ];
            }

            public function status(): DeviceStatus
            {
                return new DeviceStatus(true, '2026-07-06 09:30:00', 'K40');
            }
        });

        $this->getJson('/api/attendance/dashboard?force_sync=1')
            ->assertOk()
            ->assertJsonPath('totals.total_check_ins', 1)
            ->assertJsonPath('totals.records.0.device_user_id', '42');

        $this->assertDatabaseHas('attendance_logs', [
            'device_user_id' => '42',
            'employee_name' => 'Maya Haddad',
            'timestamp' => '2026-07-06 09:25:00',
            'state' => 'check_in',
            'verification_type' => 'Fingerprint',
        ]);
    }

    public function test_dashboard_dispatch_sync_uses_background_refresh_without_blocking_the_request(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-07-06 09:30:00'));

        Employee::create([
            'device_user_id' => '42',
            'name' => 'Maya Haddad',
        ]);

        AttendanceLog::create([
            'device_user_id' => '42',
            'employee_name' => 'Maya Haddad',
            'timestamp' => '2026-07-06 08:02:00',
            'state' => 'check_in',
            'verification_type' => 'Fingerprint',
            'raw_data' => ['uid' => 42],
        ]);

        Cache::put('attendance.device_status', [
            'online' => false,
            'device_time' => null,
            'firmware_version' => null,
            'error' => 'Unable to connect to the ZKTeco device.',
        ]);

        $mock = \Mockery::mock(AttendanceLogSynchronizer::class);
        $mock->shouldReceive('triggerBackgroundSync')
            ->once()
            ->with(true);
        $mock->shouldNotReceive('forceSync');

        $this->app->instance(AttendanceLogSynchronizer::class, $mock);

        $this->getJson('/api/attendance/dashboard?dispatch_sync=1')
            ->assertOk()
            ->assertJsonPath('totals.total_check_ins', 1)
            ->assertJsonPath('status.online', false)
            ->assertJsonPath('totals.records.0.device_user_id', '42');
    }

    public function test_monthly_statistics_endpoint_returns_real_employees_and_month_records(): void
    {
        Employee::create([
            'device_user_id' => '42',
            'name' => 'Maya Haddad',
        ]);

        Employee::create([
            'device_user_id' => '43',
            'name' => 'Anas Darwish',
        ]);

        AttendanceLog::create([
            'device_user_id' => '42',
            'employee_name' => 'Maya Haddad',
            'timestamp' => '2026-07-06 08:02:00',
            'state' => 'check_in',
            'verification_type' => 'Fingerprint',
            'raw_data' => ['uid' => 42],
        ]);

        AttendanceLog::create([
            'device_user_id' => '42',
            'employee_name' => 'Maya Haddad',
            'timestamp' => '2026-08-06 08:02:00',
            'state' => 'check_in',
            'verification_type' => 'Fingerprint',
            'raw_data' => ['uid' => 42],
        ]);

        $this->getJson('/api/attendance/monthly-statistics?month=2026-07')
            ->assertOk()
            ->assertJsonPath('month', '2026-07')
            ->assertJsonPath('employees.0.name', 'Anas Darwish')
            ->assertJsonCount(2, 'employees')
            ->assertJsonCount(1, 'records')
            ->assertJsonPath('records.0.device_user_id', '42');
    }

    public function test_sync_if_due_respects_polling_interval(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-07-06 09:30:00'));

        config()->set('attendance.device.polling_interval', 60);

        $calls = 0;

        $this->app->bind(AttendanceDeviceClient::class, function () use (&$calls): AttendanceDeviceClient {
            return new class($calls) implements AttendanceDeviceClient
            {
                public function __construct(
                    private int &$calls,
                ) {
                }

                public function usersByDeviceId(): array
                {
                    $this->calls++;

                    return ['42' => 'Maya Haddad'];
                }

                public function attendanceRecords(): array
                {
                    return [];
                }

                public function status(): DeviceStatus
                {
                    return new DeviceStatus(true);
                }
            };
        });

        $synchronizer = $this->app->make(AttendanceLogSynchronizer::class);

        $first = $synchronizer->syncIfDue();
        $second = $synchronizer->syncIfDue();

        $this->assertTrue($first['ran']);
        $this->assertFalse($second['ran']);
        $this->assertSame(1, $calls);
    }

    public function test_sync_if_due_runs_again_after_polling_interval_has_elapsed(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-07-06 09:30:00'));

        config()->set('attendance.device.polling_interval', 5);

        $calls = 0;

        $this->app->bind(AttendanceDeviceClient::class, function () use (&$calls): AttendanceDeviceClient {
            return new class($calls) implements AttendanceDeviceClient
            {
                public function __construct(
                    private int &$calls,
                ) {
                }

                public function usersByDeviceId(): array
                {
                    $this->calls++;

                    return ['42' => 'Maya Haddad'];
                }

                public function attendanceRecords(): array
                {
                    return [];
                }

                public function status(): DeviceStatus
                {
                    return new DeviceStatus(true);
                }
            };
        });

        $synchronizer = $this->app->make(AttendanceLogSynchronizer::class);

        $first = $synchronizer->syncIfDue();

        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-07-06 09:30:06'));

        $second = $synchronizer->syncIfDue();

        $this->assertTrue($first['ran']);
        $this->assertTrue($second['ran']);
        $this->assertSame(2, $calls);
    }

    public function test_summary_endpoint_calculates_total_normal_and_overtime_durations_across_multiple_days(): void
    {
        Employee::create([
            'device_user_id' => '42',
            'name' => 'Maya Haddad',
        ]);

        AttendanceLog::insert([
            [
                'device_user_id' => '42',
                'employee_name' => 'Maya Haddad',
                'timestamp' => '2026-07-06 08:00:00',
                'state' => 'check_in',
                'verification_type' => 'Fingerprint',
                'raw_data' => json_encode(['uid' => 42]),
                'created_at' => now(),
            ],
            [
                'device_user_id' => '42',
                'employee_name' => 'Maya Haddad',
                'timestamp' => '2026-07-06 10:00:00',
                'state' => 'break_out',
                'verification_type' => 'Fingerprint',
                'raw_data' => json_encode(['uid' => 42]),
                'created_at' => now(),
            ],
            [
                'device_user_id' => '42',
                'employee_name' => 'Maya Haddad',
                'timestamp' => '2026-07-06 10:30:00',
                'state' => 'break_in',
                'verification_type' => 'Fingerprint',
                'raw_data' => json_encode(['uid' => 42]),
                'created_at' => now(),
            ],
            [
                'device_user_id' => '42',
                'employee_name' => 'Maya Haddad',
                'timestamp' => '2026-07-06 17:00:00',
                'state' => 'overtime_in',
                'verification_type' => 'Fingerprint',
                'raw_data' => json_encode(['uid' => 42]),
                'created_at' => now(),
            ],
            [
                'device_user_id' => '42',
                'employee_name' => 'Maya Haddad',
                'timestamp' => '2026-07-06 19:00:00',
                'state' => 'overtime_out',
                'verification_type' => 'Fingerprint',
                'raw_data' => json_encode(['uid' => 42]),
                'created_at' => now(),
            ],
            [
                'device_user_id' => '42',
                'employee_name' => 'Maya Haddad',
                'timestamp' => '2026-07-07 08:00:00',
                'state' => 'check_in',
                'verification_type' => 'Fingerprint',
                'raw_data' => json_encode(['uid' => 42]),
                'created_at' => now(),
            ],
            [
                'device_user_id' => '42',
                'employee_name' => 'Maya Haddad',
                'timestamp' => '2026-07-07 12:00:00',
                'state' => 'break_out',
                'verification_type' => 'Fingerprint',
                'raw_data' => json_encode(['uid' => 42]),
                'created_at' => now(),
            ],
            [
                'device_user_id' => '42',
                'employee_name' => 'Maya Haddad',
                'timestamp' => '2026-07-07 13:00:00',
                'state' => 'break_in',
                'verification_type' => 'Fingerprint',
                'raw_data' => json_encode(['uid' => 42]),
                'created_at' => now(),
            ],
            [
                'device_user_id' => '42',
                'employee_name' => 'Maya Haddad',
                'timestamp' => '2026-07-07 17:00:00',
                'state' => 'check_out',
                'verification_type' => 'Fingerprint',
                'raw_data' => json_encode(['uid' => 42]),
                'created_at' => now(),
            ],
        ]);

        $this->app->bind(AttendanceDeviceClient::class, fn (): AttendanceDeviceClient => new class implements AttendanceDeviceClient
        {
            public function usersByDeviceId(): array
            {
                return ['42' => 'Maya Haddad'];
            }

            public function attendanceRecords(): array
            {
                return [];
            }

            public function status(): DeviceStatus
            {
                return new DeviceStatus(true);
            }
        });

        $this->getJson('/api/attendance/summary?device_user_id=42&from_date=2026-07-06&to_date=2026-07-07')
            ->assertOk()
            ->assertJsonPath('summary.employee_name', 'Maya Haddad')
            ->assertJsonPath('summary.total_duration_seconds', 66600)
            ->assertJsonPath('summary.total_duration_human', '18h 30m')
            ->assertJsonPath('summary.normal_duration_seconds', 59400)
            ->assertJsonPath('summary.normal_duration_human', '16h 30m')
            ->assertJsonPath('summary.overtime_duration_seconds', 7200)
            ->assertJsonPath('summary.overtime_duration_human', '2h');
    }

    public function test_report_endpoint_returns_late_duration_for_attendance_sessions(): void
    {
        Employee::create([
            'device_user_id' => '42',
            'name' => 'Maya Haddad',
        ]);

        AttendanceLog::insert([
            [
                'device_user_id' => '42',
                'employee_name' => 'Maya Haddad',
                'timestamp' => '2026-07-12 10:30:00',
                'state' => 'check_in',
                'verification_type' => 'Fingerprint',
                'raw_data' => json_encode(['uid' => 42]),
                'created_at' => now(),
            ],
            [
                'device_user_id' => '42',
                'employee_name' => 'Maya Haddad',
                'timestamp' => '2026-07-12 17:45:00',
                'state' => 'check_out',
                'verification_type' => 'Fingerprint',
                'raw_data' => json_encode(['uid' => 42]),
                'created_at' => now(),
            ],
        ]);

        $this->getJson('/api/attendance/report?device_user_id=42&from_date=2026-07-12&to_date=2026-07-12')
            ->assertOk()
            ->assertJsonPath('working_hours.start_time', '10:00')
            ->assertJsonPath('working_hours.end_time', '18:00')
            ->assertJsonPath('summary.late_duration_seconds', 1800)
            ->assertJsonPath('summary.late_duration_human', '30m')
            ->assertJsonPath('sessions.0.late_seconds', 1800)
            ->assertJsonPath('sessions.0.late_human', '30m')
            ->assertJsonPath('sessions.0.duration_human', '7h 15m');
    }

    public function test_report_endpoint_marks_missing_days_as_absent_with_full_late_duration(): void
    {
        config()->set('attendance.schedule.off_days', '5');

        Employee::create([
            'device_user_id' => '42',
            'name' => 'Maya Haddad',
        ]);

        AttendanceLog::insert([
            [
                'device_user_id' => '42',
                'employee_name' => 'Maya Haddad',
                'timestamp' => '2026-07-12 10:30:00',
                'state' => 'check_in',
                'verification_type' => 'Fingerprint',
                'raw_data' => json_encode(['uid' => 42]),
                'created_at' => now(),
            ],
            [
                'device_user_id' => '42',
                'employee_name' => 'Maya Haddad',
                'timestamp' => '2026-07-12 17:45:00',
                'state' => 'check_out',
                'verification_type' => 'Fingerprint',
                'raw_data' => json_encode(['uid' => 42]),
                'created_at' => now(),
            ],
        ]);

        $this->getJson('/api/attendance/report?device_user_id=42&from_date=2026-07-11&to_date=2026-07-12')
            ->assertOk()
            ->assertJsonPath('summary.total_duration_human', '7h 15m')
            ->assertJsonPath('summary.late_duration_seconds', 30600)
            ->assertJsonPath('summary.late_duration_human', '8h 30m')
            ->assertJsonPath('totals.session_count', 2)
            ->assertJsonPath('totals.completed_session_count', 1)
            ->assertJsonPath('sessions.0.attendance_date', '2026-07-12')
            ->assertJsonPath('sessions.0.late_human', '30m')
            ->assertJsonPath('sessions.1.session_type', 'absence')
            ->assertJsonPath('sessions.1.session_type_label', 'Absent')
            ->assertJsonPath('sessions.1.attendance_date', '2026-07-11')
            ->assertJsonPath('sessions.1.check_in_time', null)
            ->assertJsonPath('sessions.1.check_out_time', null)
            ->assertJsonPath('sessions.1.duration_human', '0m')
            ->assertJsonPath('sessions.1.late_seconds', 28800)
            ->assertJsonPath('sessions.1.late_human', '8h')
            ->assertJsonPath('sessions.1.method', 'No punches')
            ->assertJsonPath('sessions.1.is_absent', true);
    }

    public function test_report_endpoint_does_not_count_late_or_absence_on_off_days(): void
    {
        config()->set('attendance.schedule.off_days', '0');

        Employee::create([
            'device_user_id' => '42',
            'name' => 'Maya Haddad',
        ]);

        AttendanceLog::insert([
            [
                'device_user_id' => '42',
                'employee_name' => 'Maya Haddad',
                'timestamp' => '2026-07-12 10:30:00',
                'state' => 'check_in',
                'verification_type' => 'Fingerprint',
                'raw_data' => json_encode(['uid' => 42]),
                'created_at' => now(),
            ],
            [
                'device_user_id' => '42',
                'employee_name' => 'Maya Haddad',
                'timestamp' => '2026-07-12 17:45:00',
                'state' => 'check_out',
                'verification_type' => 'Fingerprint',
                'raw_data' => json_encode(['uid' => 42]),
                'created_at' => now(),
            ],
        ]);

        $this->getJson('/api/attendance/report?device_user_id=42&from_date=2026-07-12&to_date=2026-07-12')
            ->assertOk()
            ->assertJsonPath('summary.late_duration_seconds', 0)
            ->assertJsonPath('summary.late_duration_human', '0m')
            ->assertJsonPath('totals.session_count', 1)
            ->assertJsonPath('sessions.0.attendance_date', '2026-07-12')
            ->assertJsonPath('sessions.0.late_seconds', 0)
            ->assertJsonPath('sessions.0.late_human', '0m');
    }

    public function test_employee_working_hours_endpoint_saves_custom_hours_for_one_employee(): void
    {
        Employee::create([
            'device_user_id' => '42',
            'name' => 'Maya Haddad',
        ]);

        $this->postJson('/api/employees/42/working-hours', [
            'work_start_time' => '12:00',
            'work_end_time' => '20:00',
        ])
            ->assertOk()
            ->assertJsonPath('employee.device_user_id', '42')
            ->assertJsonPath('employee.working_hours.start_time', '12:00')
            ->assertJsonPath('employee.working_hours.end_time', '20:00')
            ->assertJsonPath('employee.has_custom_working_hours', true);

        $this->assertDatabaseHas('employees', [
            'device_user_id' => '42',
            'work_start_time' => '12:00',
            'work_end_time' => '20:00',
        ]);
    }

    public function test_default_working_hours_endpoint_saves_the_default_schedule_to_the_env_file(): void
    {
        $envPath = storage_path('framework/testing/'.Str::uuid().'.env');

        file_put_contents($envPath, implode(PHP_EOL, [
            'APP_NAME="Nexa Attendance Monitor"',
            'ATTENDANCE_WORK_START=10:00',
            'ATTENDANCE_WORK_END=18:00',
            'ATTENDANCE_OFF_DAYS=0',
            '',
        ]));

        config()->set('attendance.schedule.env_path', $envPath);

        $this->postJson('/api/attendance/default-working-hours', [
            'work_start_time' => '09:00',
            'work_end_time' => '17:00',
            'off_days' => [5, 6],
        ])
            ->assertOk()
            ->assertJsonPath('working_hours.start_time', '09:00')
            ->assertJsonPath('working_hours.end_time', '17:00')
            ->assertJsonPath('working_hours.off_days.0', 5)
            ->assertJsonPath('working_hours.off_days.1', 6);

        $updatedContents = file_get_contents($envPath);

        $this->assertStringContainsString('ATTENDANCE_WORK_START=09:00', $updatedContents);
        $this->assertStringContainsString('ATTENDANCE_WORK_END=17:00', $updatedContents);
        $this->assertStringContainsString('ATTENDANCE_OFF_DAYS=5,6', $updatedContents);

        @unlink($envPath);
    }

    public function test_device_settings_endpoint_saves_the_device_connection_to_the_env_file(): void
    {
        $envPath = storage_path('framework/testing/'.Str::uuid().'.env');

        file_put_contents($envPath, implode(PHP_EOL, [
            'APP_NAME="Nexa Attendance Monitor"',
            'ZKTECO_DEVICE_IP=192.168.1.201',
            'ZKTECO_DEVICE_PORT=4370',
            'ZKTECO_PROTOCOL=tcp',
            '',
        ]));

        config()->set('attendance.device.env_path', $envPath);

        $this->postJson('/api/attendance/device-settings', [
            'device_ip' => '192.168.1.250',
            'device_port' => 5005,
            'device_protocol' => 'udp',
        ])
            ->assertOk()
            ->assertJsonPath('device.ip', '192.168.1.250')
            ->assertJsonPath('device.port', 5005)
            ->assertJsonPath('device.protocol', 'udp');

        $updatedContents = file_get_contents($envPath);

        $this->assertStringContainsString('ZKTECO_DEVICE_IP=192.168.1.250', $updatedContents);
        $this->assertStringContainsString('ZKTECO_DEVICE_PORT=5005', $updatedContents);
        $this->assertStringContainsString('ZKTECO_PROTOCOL=udp', $updatedContents);

        @unlink($envPath);
    }

    public function test_report_endpoint_uses_custom_employee_working_hours_for_late_calculation(): void
    {
        Employee::create([
            'device_user_id' => '42',
            'name' => 'Maya Haddad',
            'work_start_time' => '12:00',
            'work_end_time' => '20:00',
        ]);

        AttendanceLog::insert([
            [
                'device_user_id' => '42',
                'employee_name' => 'Maya Haddad',
                'timestamp' => '2026-07-12 12:30:00',
                'state' => 'check_in',
                'verification_type' => 'Fingerprint',
                'raw_data' => json_encode(['uid' => 42]),
                'created_at' => now(),
            ],
            [
                'device_user_id' => '42',
                'employee_name' => 'Maya Haddad',
                'timestamp' => '2026-07-12 19:45:00',
                'state' => 'check_out',
                'verification_type' => 'Fingerprint',
                'raw_data' => json_encode(['uid' => 42]),
                'created_at' => now(),
            ],
        ]);

        $this->getJson('/api/attendance/report?device_user_id=42&from_date=2026-07-12&to_date=2026-07-12')
            ->assertOk()
            ->assertJsonPath('working_hours.start_time', '12:00')
            ->assertJsonPath('working_hours.end_time', '20:00')
            ->assertJsonPath('summary.late_duration_seconds', 1800)
            ->assertJsonPath('summary.late_duration_human', '30m')
            ->assertJsonPath('sessions.0.late_seconds', 1800)
            ->assertJsonPath('sessions.0.late_human', '30m');
    }

    public function test_report_endpoint_shows_an_in_progress_session_for_today_before_check_out(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-07-12 15:30:00'));

        Employee::create([
            'device_user_id' => '42',
            'name' => 'Maya Haddad',
            'work_start_time' => '12:00',
            'work_end_time' => '20:00',
        ]);

        AttendanceLog::create([
            'device_user_id' => '42',
            'employee_name' => 'Maya Haddad',
            'timestamp' => '2026-07-12 12:30:00',
            'state' => 'check_in',
            'verification_type' => 'Fingerprint',
            'raw_data' => ['uid' => 42],
        ]);

        $this->getJson('/api/attendance/report?device_user_id=42&from_date=2026-07-12&to_date=2026-07-12')
            ->assertOk()
            ->assertJsonPath('summary.total_duration_seconds', 10800)
            ->assertJsonPath('summary.total_duration_human', '3h')
            ->assertJsonPath('summary.late_duration_seconds', 1800)
            ->assertJsonPath('summary.late_duration_human', '30m')
            ->assertJsonPath('totals.session_count', 1)
            ->assertJsonPath('totals.completed_session_count', 0)
            ->assertJsonPath('sessions.0.check_in_time', '12:30:00')
            ->assertJsonPath('sessions.0.check_out_time', null)
            ->assertJsonPath('sessions.0.duration_seconds', 10800)
            ->assertJsonPath('sessions.0.duration_human', '3h')
            ->assertJsonPath('sessions.0.is_in_progress', true)
            ->assertJsonPath('sessions.0.late_seconds', 1800)
            ->assertJsonPath('sessions.0.late_human', '30m');
    }

    public function test_report_endpoint_does_not_count_late_for_break_return_sessions(): void
    {
        Employee::create([
            'device_user_id' => '42',
            'name' => 'Maya Haddad',
        ]);

        AttendanceLog::insert([
            [
                'device_user_id' => '42',
                'employee_name' => 'Maya Haddad',
                'timestamp' => '2026-07-12 09:30:00',
                'state' => 'check_in',
                'verification_type' => 'Fingerprint',
                'raw_data' => json_encode(['uid' => 42]),
                'created_at' => now(),
            ],
            [
                'device_user_id' => '42',
                'employee_name' => 'Maya Haddad',
                'timestamp' => '2026-07-12 12:00:00',
                'state' => 'break_out',
                'verification_type' => 'Fingerprint',
                'raw_data' => json_encode(['uid' => 42]),
                'created_at' => now(),
            ],
            [
                'device_user_id' => '42',
                'employee_name' => 'Maya Haddad',
                'timestamp' => '2026-07-12 12:30:00',
                'state' => 'break_in',
                'verification_type' => 'Fingerprint',
                'raw_data' => json_encode(['uid' => 42]),
                'created_at' => now(),
            ],
            [
                'device_user_id' => '42',
                'employee_name' => 'Maya Haddad',
                'timestamp' => '2026-07-12 17:00:00',
                'state' => 'check_out',
                'verification_type' => 'Fingerprint',
                'raw_data' => json_encode(['uid' => 42]),
                'created_at' => now(),
            ],
        ]);

        $this->getJson('/api/attendance/report?device_user_id=42&from_date=2026-07-12&to_date=2026-07-12')
            ->assertOk()
            ->assertJsonPath('summary.late_duration_seconds', 0)
            ->assertJsonPath('summary.late_duration_human', '0m')
            ->assertJsonPath('sessions.0.late_seconds', null)
            ->assertJsonPath('sessions.0.late_human', '--')
            ->assertJsonPath('sessions.1.late_seconds', 0)
            ->assertJsonPath('sessions.1.late_human', '0m');
    }

    public function test_report_endpoint_does_not_pair_attendance_sessions_across_different_days(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-07-12 18:00:00'));

        Employee::create([
            'device_user_id' => '1',
            'name' => 'Ali',
        ]);

        AttendanceLog::insert([
            [
                'device_user_id' => '1',
                'employee_name' => 'Ali',
                'timestamp' => '2026-07-08 14:54:13',
                'state' => 'check_in',
                'verification_type' => 'Fingerprint',
                'raw_data' => json_encode(['uid' => 1]),
                'created_at' => now(),
            ],
            [
                'device_user_id' => '1',
                'employee_name' => 'Ali',
                'timestamp' => '2026-07-09 14:55:30',
                'state' => 'check_out',
                'verification_type' => 'Fingerprint',
                'raw_data' => json_encode(['uid' => 1]),
                'created_at' => now(),
            ],
        ]);

        $this->getJson('/api/attendance/report?device_user_id=1&from_date=2026-07-08&to_date=2026-07-09')
            ->assertOk()
            ->assertJsonPath('summary.total_duration_seconds', 0)
            ->assertJsonPath('summary.total_duration_human', '0m')
            ->assertJsonPath('totals.session_count', 1)
            ->assertJsonPath('totals.completed_session_count', 0)
            ->assertJsonPath('sessions.0.attendance_date', '2026-07-08')
            ->assertJsonPath('sessions.0.check_in_time', '14:54:13')
            ->assertJsonPath('sessions.0.check_out_time', null)
            ->assertJsonPath('sessions.0.duration_human', '--');
    }

    public function test_manual_check_out_endpoint_creates_a_manual_check_out_for_an_open_session(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-07-12 18:00:00'));

        Employee::create([
            'device_user_id' => '42',
            'name' => 'Maya Haddad',
        ]);

        AttendanceLog::create([
            'device_user_id' => '42',
            'employee_name' => 'Maya Haddad',
            'timestamp' => '2026-07-12 08:00:00',
            'state' => 'check_in',
            'verification_type' => 'Fingerprint',
            'raw_data' => ['uid' => 42],
        ]);

        $this->postJson('/api/attendance/manual-check-out', [
            'device_user_id' => '42',
            'attendance_date' => '2026-07-12',
            'attendance_time' => '17:10',
            'note' => 'Forgot to check out',
        ])
            ->assertCreated()
            ->assertJsonPath('message', 'Manual check-out saved successfully.')
            ->assertJsonPath('entry.device_user_id', '42')
            ->assertJsonPath('entry.employee_name', 'Maya Haddad');

        $this->assertDatabaseHas('manual_attendance_entries', [
            'device_user_id' => '42',
            'employee_name' => 'Maya Haddad',
            'timestamp' => '2026-07-12 17:10:00',
            'state' => 'check_out',
            'verification_type' => 'Manual Entry',
            'note' => 'Forgot to check out',
        ]);
    }

    public function test_manual_check_out_endpoint_rejects_when_there_is_no_open_session_before_the_time(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-07-12 18:00:00'));

        Employee::create([
            'device_user_id' => '42',
            'name' => 'Maya Haddad',
        ]);

        $this->postJson('/api/attendance/manual-check-out', [
            'device_user_id' => '42',
            'attendance_date' => '2026-07-12',
            'attendance_time' => '17:10',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('attendance_time')
            ->assertJsonPath(
                'errors.attendance_time.0',
                'This employee does not have an open attendance session before this time.'
            );
    }

    public function test_sync_infers_first_ambiguous_255_punch_as_check_in(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-07-09 11:50:00'));

        $this->app->bind(AttendanceDeviceClient::class, fn (): AttendanceDeviceClient => new class implements AttendanceDeviceClient
        {
            public function usersByDeviceId(): array
            {
                return ['7' => 'Ghazal'];
            }

            public function attendanceRecords(): array
            {
                return [
                    new AttendanceRecord(
                        deviceUserId: '7',
                        employeeName: null,
                        timestamp: CarbonImmutable::parse('2026-07-09 11:46:50'),
                        state: 'check_out',
                        verificationType: 'Unknown (255)',
                        rawData: ['uid' => 73, 'user_id' => 7, 'state' => 1, 'record_time' => '2026-07-09 11:46:50', 'type' => 255],
                    ),
                ];
            }

            public function status(): DeviceStatus
            {
                return new DeviceStatus(true);
            }
        });

        $this->app->make(AttendanceLogSynchronizer::class)->sync();

        $this->assertDatabaseHas('attendance_logs', [
            'device_user_id' => '7',
            'timestamp' => '2026-07-09 11:46:50',
            'state' => 'check_in',
            'verification_type' => 'Fingerprint',
        ]);
    }

    public function test_sync_infers_ambiguous_255_punch_after_check_in_as_check_out(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-07-09 11:50:00'));

        AttendanceLog::create([
            'device_user_id' => '7',
            'employee_name' => 'Ghazal',
            'timestamp' => '2026-07-09 11:40:00',
            'state' => 'check_in',
            'verification_type' => 'Fingerprint',
            'raw_data' => ['uid' => 70],
        ]);

        $this->app->bind(AttendanceDeviceClient::class, fn (): AttendanceDeviceClient => new class implements AttendanceDeviceClient
        {
            public function usersByDeviceId(): array
            {
                return ['7' => 'Ghazal'];
            }

            public function attendanceRecords(): array
            {
                return [
                    new AttendanceRecord(
                        deviceUserId: '7',
                        employeeName: null,
                        timestamp: CarbonImmutable::parse('2026-07-09 11:46:50'),
                        state: 'check_out',
                        verificationType: 'Unknown (255)',
                        rawData: ['uid' => 73, 'user_id' => 7, 'state' => 1, 'record_time' => '2026-07-09 11:46:50', 'type' => 255],
                    ),
                ];
            }

            public function status(): DeviceStatus
            {
                return new DeviceStatus(true);
            }
        });

        $this->app->make(AttendanceLogSynchronizer::class)->sync();

        $this->assertDatabaseHas('attendance_logs', [
            'device_user_id' => '7',
            'timestamp' => '2026-07-09 11:46:50',
            'state' => 'check_out',
            'verification_type' => 'Fingerprint',
        ]);
    }

    public function test_reconcile_with_device_deletes_local_logs_missing_from_the_device(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-07-09 11:50:00'));

        AttendanceLog::insert([
            [
                'device_user_id' => '7',
                'employee_name' => 'Ghazal',
                'timestamp' => '2026-07-08 08:00:00',
                'state' => 'check_in',
                'verification_type' => 'Fingerprint',
                'raw_data' => json_encode(['uid' => 70]),
                'created_at' => now(),
            ],
            [
                'device_user_id' => '7',
                'employee_name' => 'Ghazal',
                'timestamp' => '2026-07-09 08:00:00',
                'state' => 'check_in',
                'verification_type' => 'Fingerprint',
                'raw_data' => json_encode(['uid' => 70]),
                'created_at' => now(),
            ],
        ]);

        $this->app->bind(AttendanceDeviceClient::class, fn (): AttendanceDeviceClient => new class implements AttendanceDeviceClient
        {
            public function usersByDeviceId(): array
            {
                return ['7' => 'Ghazal'];
            }

            public function attendanceRecords(): array
            {
                return [
                    new AttendanceRecord(
                        deviceUserId: '7',
                        employeeName: null,
                        timestamp: CarbonImmutable::parse('2026-07-09 08:00:00'),
                        state: 'check_in',
                        verificationType: 'Fingerprint',
                        rawData: ['uid' => 70],
                    ),
                ];
            }

            public function status(): DeviceStatus
            {
                return new DeviceStatus(true);
            }
        });

        $result = $this->app->make(AttendanceLogSynchronizer::class)->reconcileWithDevice();

        $this->assertSame([
            'fetched' => 1,
            'inserted' => 0,
            'skipped' => 1,
            'deleted' => 1,
        ], $result);

        $this->assertDatabaseMissing('attendance_logs', [
            'device_user_id' => '7',
            'timestamp' => '2026-07-08 08:00:00',
            'state' => 'check_in',
            'verification_type' => 'Fingerprint',
        ]);

        $this->assertDatabaseHas('attendance_logs', [
            'device_user_id' => '7',
            'timestamp' => '2026-07-09 08:00:00',
            'state' => 'check_in',
            'verification_type' => 'Fingerprint',
        ]);
    }
}
