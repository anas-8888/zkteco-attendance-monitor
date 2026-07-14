<?php

namespace App\Console\Commands;

use App\Services\Initialization\ApplicationInitializationState;
use Illuminate\Console\Command;
use Throwable;

class ApplicationInitializationStatusCommand extends Command
{
    protected $signature = 'app:initialization-status {--json : Output machine-readable JSON for Electron}';

    protected $description = 'Report whether the installed application has been initialized successfully.';

    public function handle(ApplicationInitializationState $state): int
    {
        try {
            $status = $state->status();
        } catch (Throwable $exception) {
            report($exception);

            if ($this->option('json')) {
                $this->line((string) json_encode([
                    'initialized' => false,
                    'message' => $exception->getMessage(),
                ], JSON_UNESCAPED_SLASHES));
            } else {
                $this->error($exception->getMessage());
            }

            return self::FAILURE;
        }

        if ($this->option('json')) {
            $this->line((string) json_encode($status, JSON_UNESCAPED_SLASHES));

            return self::SUCCESS;
        }

        $this->line($status['message']);

        return self::SUCCESS;
    }
}
