<?php

namespace Tests;

use App\Models\ApplicationSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function markApplicationInitialized(?string $timestamp = null): void
    {
        ApplicationSetting::query()->updateOrCreate(
            ['key' => 'app.initialized_at'],
            ['value' => $timestamp ?? now()->toIso8601String()],
        );
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    protected function createInitializedAdministrator(array $attributes = []): User
    {
        $user = User::query()->create(array_merge([
            'name' => 'admin',
            'email' => 'admin@local.nexa',
            'role' => User::ROLE_ADMINISTRATOR,
            'password' => 'Secret123!',
        ], $attributes));

        $this->markApplicationInitialized();

        return $user;
    }
}
