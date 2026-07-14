<?php

namespace App\Services\Initialization;

use App\Models\ApplicationSetting;
use App\Models\User;

class ApplicationInitializationState
{
    public const INITIALIZED_AT_KEY = 'app.initialized_at';

    public function isInitialized(): bool
    {
        return $this->hasInitializationMarker() && $this->administratorExists();
    }

    public function canUseBrowserSetup(): bool
    {
        return $this->browserSetupAllowed()
            && ! $this->hasInitializationMarker()
            && ! $this->hasUsers();
    }

    public function browserSetupAllowed(): bool
    {
        return (bool) config('installation.allow_browser_setup', true);
    }

    public function hasInitializationMarker(): bool
    {
        return ApplicationSetting::query()
            ->where('key', self::INITIALIZED_AT_KEY)
            ->whereNotNull('value')
            ->exists();
    }

    public function administratorExists(): bool
    {
        return User::query()
            ->where('role', User::ROLE_ADMINISTRATOR)
            ->exists();
    }

    public function hasUsers(): bool
    {
        return User::query()->exists();
    }

    public function markInitialized(string $timestamp): void
    {
        ApplicationSetting::query()->updateOrCreate(
            ['key' => self::INITIALIZED_AT_KEY],
            ['value' => $timestamp],
        );
    }

    /**
     * @return array{initialized: bool, marker_present: bool, administrator_exists: bool, allow_browser_setup: bool, message: string}
     */
    public function status(): array
    {
        $markerPresent = $this->hasInitializationMarker();
        $administratorExists = $this->administratorExists();
        $initialized = $markerPresent && $administratorExists;

        return [
            'initialized' => $initialized,
            'marker_present' => $markerPresent,
            'administrator_exists' => $administratorExists,
            'allow_browser_setup' => $this->browserSetupAllowed(),
            'message' => $this->messageFor($initialized, $markerPresent, $administratorExists),
        ];
    }

    private function messageFor(bool $initialized, bool $markerPresent, bool $administratorExists): string
    {
        if ($initialized) {
            return 'Application initialization is complete.';
        }

        if ($markerPresent || $administratorExists || $this->hasUsers()) {
            return 'The application data is incomplete or partially initialized. Reinstall or restore the application data before launching it.';
        }

        if ($this->browserSetupAllowed()) {
            return 'Application initialization has not been completed yet.';
        }

        return 'Installation did not complete correctly. Reinstall the application to create the administrator account.';
    }
}
