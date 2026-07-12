<?php

namespace App\Http\Middleware;

use App\Support\EnvCredentials;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEnvAuthenticated
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->routeIs('login.*')) {
            return $next($request);
        }

        $auth = $request->session()->get('env_auth');

        if (
            ! is_array($auth)
            || ($auth['username'] ?? null) !== EnvCredentials::username()
            || ! hash_equals((string) ($auth['signature'] ?? ''), EnvCredentials::signature())
        ) {
            $request->session()->forget('env_auth');

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
