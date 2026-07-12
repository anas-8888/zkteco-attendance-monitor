<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Support\EnvCredentials;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class LoginController extends Controller
{
    public function show(Request $request): View|RedirectResponse
    {
        if ($this->isAuthenticated($request)) {
            return redirect()->route('dashboard');
        }

        return view('auth.login');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $expectedUsername = EnvCredentials::username();
        $expectedPassword = EnvCredentials::password();

        if (
            ! hash_equals($expectedUsername, (string) $validated['username'])
            || ! hash_equals($expectedPassword, (string) $validated['password'])
        ) {
            return back()
                ->withInput($request->only('username'))
                ->withErrors([
                    'username' => 'The provided credentials are invalid.',
                ]);
        }

        $request->session()->invalidate();
        $request->session()->regenerateToken();
        $request->session()->put('env_auth', [
            'username' => $expectedUsername,
            'signature' => EnvCredentials::signature(),
        ]);
        $request->session()->regenerate();

        return redirect()->route('dashboard');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $request->session()->forget('env_auth');
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login.show');
    }

    private function isAuthenticated(Request $request): bool
    {
        $auth = $request->session()->get('env_auth');

        return is_array($auth)
            && ($auth['username'] ?? null) === EnvCredentials::username()
            && hash_equals((string) ($auth['signature'] ?? ''), EnvCredentials::signature());
    }
}
