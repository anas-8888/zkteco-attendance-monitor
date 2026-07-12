<?php

namespace App\Services\Attendance\DTO;

use Carbon\CarbonImmutable;

class AttendanceTimelineRecord
{
    public function __construct(
        public readonly int $id,
        public readonly string $source,
        public readonly string $deviceUserId,
        public readonly string $employeeName,
        public readonly CarbonImmutable $timestamp,
        public readonly string $state,
        public readonly string $verificationType,
        public readonly ?string $note = null,
    ) {
    }

    public function sourcePriority(): int
    {
        return $this->source === 'device' ? 0 : 1;
    }
}
