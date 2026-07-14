<?php

namespace App\Console\Commands;

use App\Services\Initialization\ApplicationInitializationService;
use Illuminate\Console\Command;
use Illuminate\Validation\ValidationException;
use Throwable;

class InitializeApplicationCommand extends Command
{
    protected $signature = 'app:initialize
        {--username= : Administrator username}
        {--password= : Administrator password}
        {--password-confirmation= : Administrator password confirmation}
        {--json : Output machine-readable JSON for Electron}';

    protected $description = 'Initialize the installed application and create the first administrator account.';

    public function handle(ApplicationInitializationService $service): int
    {
        try {
            $user = $service->initialize($this->payload());
        } catch (ValidationException $exception) {
            return $this->failWith(
                $exception->validator->errors()->first(),
                $exception->errors(),
            );
        } catch (Throwable $exception) {
            report($exception);

            return $this->failWith($exception->getMessage());
        }

        return $this->succeedWith(sprintf(
            'Application initialized successfully. Administrator "%s" is ready to sign in.',
            $user->name,
        ));
    }

    /**
     * @return array{username: string, password: string, password_confirmation: string}
     */
    private function payload(): array
    {
        return [
            'username' => $this->optionValue('username', 'NEXA_INSTALLER_USERNAME'),
            'password' => $this->optionValue('password', 'NEXA_INSTALLER_PASSWORD'),
            'password_confirmation' => $this->optionValue('password-confirmation', 'NEXA_INSTALLER_PASSWORD_CONFIRMATION'),
        ];
    }

    private function optionValue(string $option, string $environmentKey): string
    {
        $value = $this->option($option);

        if (is_string($value) && trim($value) !== '') {
            return $value;
        }

        $environmentValue = env($environmentKey, '');

        return is_string($environmentValue) ? $environmentValue : '';
    }

    /**
     * @param  array<string, array<int, string>>  $errors
     */
    private function failWith(string $message, array $errors = []): int
    {
        if ($this->option('json')) {
            $this->line((string) json_encode([
                'success' => false,
                'message' => $message,
                'errors' => $errors,
            ], JSON_UNESCAPED_SLASHES));

            return self::FAILURE;
        }

        $this->error($message);

        return self::FAILURE;
    }

    private function succeedWith(string $message): int
    {
        if ($this->option('json')) {
            $this->line((string) json_encode([
                'success' => true,
                'message' => $message,
            ], JSON_UNESCAPED_SLASHES));

            return self::SUCCESS;
        }

        $this->info($message);

        return self::SUCCESS;
    }
}
