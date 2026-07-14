<?php

namespace App\Http\Middleware;

use App\Services\Initialization\ApplicationInitializationState;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEnvAuthenticated
{
    public function __construct(
        private readonly ApplicationInitializationState $initializationState,
    ) {
    }

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->routeIs('installation.incomplete')) {
            return $next($request);
        }

        if (! $this->initializationState->isInitialized()) {
            if ($request->routeIs('login.*')) {
                return $this->initializationState->canUseBrowserSetup()
                    ? redirect()->route('setup.show')
                    : redirect()->route('installation.incomplete');
            }

            if ($request->routeIs('setup.*') && $this->initializationState->canUseBrowserSetup()) {
                return $next($request);
            }

            if ($request->expectsJson()) {
                return response()->json([
                    'message' => $this->initializationState->status()['message'],
                ], 503);
            }

            return $this->initializationState->canUseBrowserSetup()
                ? redirect()->route('setup.show')
                : redirect()->route('installation.incomplete');
        }

        if ($request->routeIs('login.*') || $request->routeIs('setup.*')) {
            return $next($request);
        }

        $userId = $request->session()->get('auth_user_id');

        if (! is_numeric($userId) || ! \App\Models\User::query()->whereKey($userId)->exists()) {
            $request->session()->forget('auth_user_id');

            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'Authentication required.',
                ], 401);
            }

            return redirect()
                ->route('login.show')
                ->with('auth_error', 'Please sign in to continue.');
        }

        return $next($request);
    }
}
