<?php

namespace App\Services\Attendance\Contracts;

use App\Services\Attendance\DTO\AttendanceRecord;
use App\Services\Attendance\DTO\DeviceStatus;

interface AttendanceDeviceClient
{
    /**
     * @return array<string, string>
     */
    public function usersByDeviceId(): array;

    /**
     * @return array<int, AttendanceRecord>
     */
    public function attendanceRecords(): array;

    public function status(): DeviceStatus;
}
