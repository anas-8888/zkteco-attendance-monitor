<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\SetupController;
use App\Models\Employee;
use App\Services\Initialization\ApplicationInitializationState;
use App\Services\Attendance\AttendanceWorkingHoursService;
use App\Services\Attendance\DeviceConnectionSettingsManager;
use Illuminate\Support\Facades\Route;

Route::get('/setup', [SetupController::class, 'show'])->name('setup.show');
Route::post('/setup', [SetupController::class, 'store'])->name('setup.store');
Route::get('/login', [LoginController::class, 'show'])->name('login.show');
Route::post('/login', [LoginController::class, 'store'])->name('login.store');
Route::post('/logout', [LoginController::class, 'destroy'])->name('login.destroy');
Route::get('/installation/incomplete', function (ApplicationInitializationState $initializationState) {
    return view('auth.installation-incomplete', [
        'message' => $initializationState->status()['message'],
    ]);
})->name('installation.incomplete');

Route::get('/', function () {
    return view('dashboard');
})->name('dashboard');

Route::get('/salary-statistics', function () {
    return view('salary-statistics');
})->name('salary-statistics');

Route::get('/reports', function () {
    $selectedEmployeeId = request()->query('employee_id');
    $employees = Employee::query()
        ->orderBy('name')
        ->get(['device_user_id', 'name', 'work_start_time', 'work_end_time']);

    return view('reports', [
        'selectedEmployeeId' => is_string($selectedEmployeeId) ? $selectedEmployeeId : '',
        'selectedEmployee' => is_string($selectedEmployeeId)
            ? $employees->firstWhere('device_user_id', $selectedEmployeeId)
            : null,
        'employees' => $employees,
    ]);
})->name('reports');

Route::get('/employees', function (AttendanceWorkingHoursService $workingHoursService) {
    return view('employees', [
        'employees' => Employee::query()
            ->orderBy('name')
            ->get(['device_user_id', 'name', 'work_start_time', 'work_end_time']),
        'defaultWorkingHours' => $workingHoursService->configuration(),
    ]);
})->name('employees');

Route::get('/working-hours', function () {
    return redirect()->route('settings');
})->name('working-hours');

Route::get('/settings', function (
    DeviceConnectionSettingsManager $deviceConnectionSettingsManager,
    AttendanceWorkingHoursService $workingHoursService,
) {
    return view('settings', [
        'deviceSettings' => $deviceConnectionSettingsManager->configuration(),
        'workingHours' => $workingHoursService->configuration(),
        'customEmployees' => Employee::query()
            ->whereNotNull('work_start_time')
            ->whereNotNull('work_end_time')
            ->orderBy('name')
            ->get(['device_user_id', 'name', 'work_start_time', 'work_end_time']),
    ]);
})->name('settings');

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
