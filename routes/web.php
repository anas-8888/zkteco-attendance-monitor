<?php

use App\Http\Controllers\Auth\LoginController;
use App\Models\Employee;
use Illuminate\Support\Facades\Route;

Route::get('/login', [LoginController::class, 'show'])->name('login.show');
Route::post('/login', [LoginController::class, 'store'])->name('login.store');
Route::post('/logout', [LoginController::class, 'destroy'])->name('login.destroy');

Route::get('/', function () {
    return view('dashboard');
})->name('dashboard');

Route::get('/salary-statistics', function () {
    return view('salary-statistics');
})->name('salary-statistics');

Route::get('/reports', function () {
    return view('reports', [
        'employees' => Employee::query()
            ->orderBy('name')
            ->get(['device_user_id', 'name', 'work_start_time', 'work_end_time']),
    ]);
})->name('reports');

Route::get('/employees/{employeeId}', function (string $employeeId) {
    return view('salary-statistics', [
        'employeeId' => $employeeId,
    ]);
})->name('employee-profile');

Route::get('/employees/{employeeId}/attendance', function (string $employeeId) {
    return view('salary-statistics', [
        'employeeId' => $employeeId,
    ]);
})->name('employee-attendance');
