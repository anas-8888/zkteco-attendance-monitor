<?php

use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\DeviceStatusController;
use Illuminate\Support\Facades\Route;

Route::middleware('web')->group(function (): void {
    Route::get('/attendance', [AttendanceController::class, 'index']);
    Route::get('/attendance/dashboard', [AttendanceController::class, 'dashboard']);
    Route::get('/attendance/monthly-statistics', [AttendanceController::class, 'monthlyStatisticsData']);
    Route::get('/attendance/report', [AttendanceController::class, 'report']);
    Route::get('/attendance/summary', [AttendanceController::class, 'summary']);
    Route::get('/attendance/today', [AttendanceController::class, 'today']);
    Route::post('/attendance/default-working-hours', [AttendanceController::class, 'updateDefaultWorkingHours']);
    Route::post('/attendance/device-settings', [AttendanceController::class, 'updateDeviceSettings']);
    Route::post('/employees/{deviceUserId}/working-hours', [AttendanceController::class, 'updateEmployeeWorkingHours']);
    Route::post('/attendance/manual-check-in', [AttendanceController::class, 'manualCheckIn']);
    Route::post('/attendance/manual-check-out', [AttendanceController::class, 'manualCheckOut']);
    Route::get('/device/status', DeviceStatusController::class);
});
