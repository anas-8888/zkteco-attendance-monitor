<?php

use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\DeviceStatusController;
use Illuminate\Support\Facades\Route;

Route::get('/attendance', [AttendanceController::class, 'index']);
Route::get('/attendance/dashboard', [AttendanceController::class, 'dashboard']);
Route::get('/attendance/today', [AttendanceController::class, 'today']);
Route::get('/device/status', DeviceStatusController::class);
