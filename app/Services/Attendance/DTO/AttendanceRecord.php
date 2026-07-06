<?php

namespace App\Services\Attendance\DTO;

use Carbon\CarbonImmutable;

final readonly class AttendanceRecord
{
    /**
     * @param array<string, mixed> $rawData
     */
    public function __construct(
        public string $deviceUserId,
        public ?string $employeeName,
        public CarbonImmutable $timestamp,
        public string $state,
        public string $verificationType,
        public array $rawData,
    ) {
    }
}
