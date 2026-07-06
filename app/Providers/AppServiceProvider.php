<?php

namespace App\Providers;

use App\Services\Attendance\Contracts\AttendanceDeviceClient;
use App\Services\Attendance\ZktecoAttendanceDeviceClient;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(AttendanceDeviceClient::class, ZktecoAttendanceDeviceClient::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
