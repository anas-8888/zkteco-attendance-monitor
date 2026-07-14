<?php

namespace App\Services\Initialization;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class ApplicationInitializationService
{
    public function __construct(
        private readonly ApplicationInitializationState $state,
    ) {
    }

    /**
     * Create the first administrator account and mark the desktop app as initialized.
     *
     * @param  array{username?: mixed, password?: mixed, password_confirmation?: mixed}  $payload
     *
     * @throws ValidationException
     */
    public function initialize(array $payload): User
    {
        // Every setup path funnels through this method so installer setup and
        // browser fallback setup share the same validation and persistence rules.
        $this->guardAgainstPartialOrDuplicateInitialization();

        $validated = Validator::make(
            $payload,
            $this->rules(),
            [
                'password.confirmed' => 'The password confirmation does not match.',
            ],
        )->validate();

        return DB::transaction(function () use ($validated): User {
            $this->guardAgainstPartialOrDuplicateInitialization();

            $user = User::query()->create([
                'name' => trim((string) $validated['username']),
                'email' => $this->installationEmail((string) $validated['username']),
                'role' => User::ROLE_ADMINISTRATOR,
                'password' => Hash::make((string) $validated['password']),
            ]);

            $this->state->markInitialized(now()->toIso8601String());

            return $user;
        });
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'username' => ['required', 'string', 'max:255', 'unique:users,name'],
            'password' => [
                'required',
                'string',
                'confirmed',
            ],
        ];
    }

    private function guardAgainstPartialOrDuplicateInitialization(): void
    {
        if ($this->state->isInitialized()) {
            throw new RuntimeException('The application has already been initialized and cannot be initialized again.');
        }

        if ($this->state->hasInitializationMarker() || $this->state->hasUsers()) {
            throw new RuntimeException(
                'The application contains partial setup data already. Remove the existing application data before retrying installation.'
            );
        }
    }

    private function installationEmail(string $username): string
    {
        $slug = Str::of($username)->trim()->lower()->slug('.');

        return sprintf('%s@local.nexa', $slug !== '' ? $slug : 'admin');
    }
}
