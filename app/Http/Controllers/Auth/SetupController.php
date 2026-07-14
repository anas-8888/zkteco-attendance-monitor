<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Initialization\ApplicationInitializationService;
use App\Services\Initialization\ApplicationInitializationState;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class SetupController extends Controller
{
    public function show(Request $request, ApplicationInitializationState $initializationState): View|RedirectResponse
    {
        if ($initializationState->isInitialized()) {
            return $this->isAuthenticated($request)
                ? redirect()->route('dashboard')
                : redirect()->route('login.show');
        }

        if (! $initializationState->canUseBrowserSetup()) {
            return redirect()->route('installation.incomplete');
        }

        return view('auth.setup');
    }

    public function store(
        Request $request,
        ApplicationInitializationState $initializationState,
        ApplicationInitializationService $initializationService,
    ): RedirectResponse
    {
        if ($initializationState->isInitialized()) {
            return redirect()->route('login.show');
        }

        if (! $initializationState->canUseBrowserSetup()) {
            return redirect()->route('installation.incomplete');
        }

        $user = $initializationService->initialize($request->only([
            'username',
            'password',
            'password_confirmation',
        ]));

        $request->session()->invalidate();
        $request->session()->regenerateToken();
        $request->session()->put('auth_user_id', $user->id);
        $request->session()->regenerate();

        return redirect()->route('dashboard');
    }

    private function isAuthenticated(Request $request): bool
    {
        $userId = $request->session()->get('auth_user_id');

        return is_numeric($userId) && User::query()->whereKey($userId)->exists();
    }
}
