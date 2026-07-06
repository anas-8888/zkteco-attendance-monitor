<?php

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('attendance:sync')
    ->everyMinute()
    ->when(function (): bool {
        $lastSyncAt = Cache::get('attendance.last_sync_at');

        if (! $lastSyncAt) {
            return true;
        }

        $elapsedSeconds = CarbonImmutable::parse($lastSyncAt)->diffInSeconds(now());

        return $elapsedSeconds >= (int) config('attendance.device.polling_interval', 60);
    })
    ->withoutOverlapping();
