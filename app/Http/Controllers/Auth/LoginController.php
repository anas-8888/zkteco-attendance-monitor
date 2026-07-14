<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Initialization\ApplicationInitializationState;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\View\View;

class LoginController extends Controller
{
    public function show(Request $request, ApplicationInitializationState $initializationState): View|RedirectResponse
    {
        if (! $initializationState->isInitialized()) {
            return $initializationState->canUseBrowserSetup()
                ? redirect()->route('setup.show')
                : redirect()->route('installation.incomplete');
        }

        if ($this->isAuthenticated($request)) {
            return redirect()->route('dashboard');
        }

        return view('auth.login');
    }

    public function store(Request $request, ApplicationInitializationState $initializationState): RedirectResponse
    {
        if (! $initializationState->isInitialized()) {
            return $initializationState->canUseBrowserSetup()
                ? redirect()->route('setup.show')
                : redirect()->route('installation.incomplete');
        }

        $validated = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()->firstWhere('name', trim((string) $validated['username']));

        if (
            ! $user instanceof User
            || ! Hash::check((string) $validated['password'], $user->password)
        ) {
            return back()
                ->withInput($request->only('username'))
                ->withErrors([
                    'username' => 'The provided credentials are invalid.',
                ]);
        }

        $request->session()->invalidate();
        $request->session()->regenerateToken();
        $request->session()->put('auth_user_id', $user->id);
        $request->session()->regenerate();

        return redirect()->route('dashboard');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $request->session()->forget('auth_user_id');
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login.show');
    }

    private function isAuthenticated(Request $request): bool
    {
        $userId = $request->session()->get('auth_user_id');

        return is_numeric($userId) && User::query()->whereKey($userId)->exists();
    }
}
