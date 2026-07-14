<?php

use App\Console\Commands\AttendanceSyncCommand;
use App\Console\Commands\AttendanceReconcileCommand;
use App\Console\Commands\ApplicationInitializationStatusCommand;
use App\Console\Commands\InitializeApplicationCommand;
use App\Http\Middleware\EnsureEnvAuthenticated;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withCommands([
        AttendanceSyncCommand::class,
        AttendanceReconcileCommand::class,
        InitializeApplicationCommand::class,
        ApplicationInitializationStatusCommand::class,
    ])
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            EnsureEnvAuthenticated::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
