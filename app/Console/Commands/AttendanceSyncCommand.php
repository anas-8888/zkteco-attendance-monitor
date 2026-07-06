<?php

namespace App\Console\Commands;

use App\Services\Attendance\AttendanceLogSynchronizer;
use Illuminate\Console\Command;
use Throwable;

class AttendanceSyncCommand extends Command
{
    protected $signature = 'attendance:sync';

    protected $description = 'Synchronize attendance logs from the configured ZKTeco device.';

    public function handle(AttendanceLogSynchronizer $synchronizer): int
    {
        $this->info('Connecting to ZKTeco device...');

        try {
            $result = $synchronizer->sync();
        } catch (Throwable $exception) {
            $this->error($exception->getMessage());

            report($exception);

            return self::FAILURE;
        }

        $this->components->info(sprintf(
            'Attendance sync complete. Fetched: %d, inserted: %d, skipped: %d.',
            $result['fetched'],
            $result['inserted'],
            $result['skipped'],
        ));

        return self::SUCCESS;
    }
}
