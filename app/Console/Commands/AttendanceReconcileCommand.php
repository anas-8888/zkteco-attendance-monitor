<?php

namespace App\Console\Commands;

use App\Services\Attendance\AttendanceLogSynchronizer;
use Illuminate\Console\Command;
use Throwable;

class AttendanceReconcileCommand extends Command
{
    protected $signature = 'attendance:reconcile';

    protected $description = 'Mirror the local attendance_logs table to the current records still stored on the configured ZKTeco device.';

    public function handle(AttendanceLogSynchronizer $synchronizer): int
    {
        $this->warn('Reconciling local attendance logs with the current device history...');
        $this->line('Only local device logs that no longer exist on the device will be deleted.');

        try {
            $result = $synchronizer->reconcileWithDevice();
        } catch (Throwable $exception) {
            $this->error($exception->getMessage());

            report($exception);

            return self::FAILURE;
        }

        $this->components->info(sprintf(
            'Attendance reconciliation complete. Fetched: %d, inserted: %d, skipped: %d, deleted: %d.',
            $result['fetched'],
            $result['inserted'],
            $result['skipped'],
            $result['deleted'],
        ));

        return self::SUCCESS;
    }
}
