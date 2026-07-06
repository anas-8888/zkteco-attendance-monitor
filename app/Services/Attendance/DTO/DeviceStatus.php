<?php

namespace App\Services\Attendance\DTO;

final readonly class DeviceStatus
{
    public function __construct(
        public bool $online,
        public ?string $deviceTime = null,
        public ?string $firmwareVersion = null,
        public ?string $error = null,
    ) {
    }

    /**
     * @return array{online: bool, device_time: ?string, firmware_version: ?string, error: ?string}
     */
    public function toArray(): array
    {
        return [
            'online' => $this->online,
            'device_time' => $this->deviceTime,
            'firmware_version' => $this->firmwareVersion,
            'error' => $this->error,
        ];
    }
}
