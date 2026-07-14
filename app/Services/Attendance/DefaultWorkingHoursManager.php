<?php

namespace App\Services\Attendance;

use Illuminate\Support\Facades\Config;

class DefaultWorkingHoursManager
{
    private const START_KEY = 'ATTENDANCE_WORK_START';
    private const END_KEY = 'ATTENDANCE_WORK_END';
    private const OFF_DAYS_KEY = 'ATTENDANCE_OFF_DAYS';

    /**
     * @return array<int, string>
     */
    public static function weekdayLabels(): array
    {
        return [
            0 => 'Sunday',
            1 => 'Monday',
            2 => 'Tuesday',
            3 => 'Wednesday',
            4 => 'Thursday',
            5 => 'Friday',
            6 => 'Saturday',
        ];
    }

    /**
     * @return array{start_time: string, end_time: string, off_days: array<int, int>, off_day_labels: array<int, string>}
     */
    public function configuration(): array
    {
        $offDays = $this->normalizeOffDays(config('attendance.schedule.off_days', '0'));

        return [
            'start_time' => $this->normalizeTime((string) config('attendance.schedule.start_time', '10:00'), '10:00'),
            'end_time' => $this->normalizeTime((string) config('attendance.schedule.end_time', '18:00'), '18:00'),
            'off_days' => $offDays,
            'off_day_labels' => array_values(array_map(
                fn (int $day): string => self::weekdayLabels()[$day],
                $offDays,
            )),
        ];
    }

    /**
     * @param  array<int, int|string>  $offDays
     * @return array{start_time: string, end_time: string, off_days: array<int, int>, off_day_labels: array<int, string>}
     */
    public function update(string $workStartTime, string $workEndTime, array $offDays): array
    {
        $normalizedOffDays = $this->normalizeOffDays($offDays);
        $contents = is_file($this->envPath())
            ? (string) file_get_contents($this->envPath())
            : '';

        $contents = $this->upsertEnvValue($contents, self::START_KEY, $workStartTime);
        $contents = $this->upsertEnvValue($contents, self::END_KEY, $workEndTime);
        $contents = $this->upsertEnvValue($contents, self::OFF_DAYS_KEY, implode(',', $normalizedOffDays));

        $directory = dirname($this->envPath());

        if (! is_dir($directory)) {
            mkdir($directory, 0777, true);
        }

        file_put_contents($this->envPath(), $contents);

        Config::set('attendance.schedule.start_time', $workStartTime);
        Config::set('attendance.schedule.end_time', $workEndTime);
        Config::set('attendance.schedule.off_days', implode(',', $normalizedOffDays));

        return $this->configuration();
    }

    private function envPath(): string
    {
        return (string) config('attendance.schedule.env_path', base_path('.env'));
    }

    private function normalizeTime(string $value, string $fallback): string
    {
        return preg_match('/^\d{2}:\d{2}$/', trim($value)) === 1
            ? trim($value)
            : $fallback;
    }

    /**
     * @param  array<int, int|string>|string|null  $value
     * @return array<int, int>
     */
    private function normalizeOffDays(array|string|null $value): array
    {
        $values = is_array($value)
            ? $value
            : preg_split('/\s*,\s*/', trim((string) $value), -1, PREG_SPLIT_NO_EMPTY);

        $normalized = collect($values)
            ->map(static fn (mixed $day): ?int => is_numeric($day) ? (int) $day : null)
            ->filter(static fn (?int $day): bool => $day !== null && $day >= 0 && $day <= 6)
            ->unique()
            ->sort()
            ->values()
            ->all();

        return $normalized === [] ? [0] : $normalized;
    }

    private function upsertEnvValue(string $contents, string $key, string $value): string
    {
        $line = sprintf('%s=%s', $key, $value);
        $pattern = sprintf('/^%s=.*$/m', preg_quote($key, '/'));

        if (preg_match($pattern, $contents) === 1) {
            return (string) preg_replace($pattern, $line, $contents);
        }

        $trimmedContents = rtrim($contents);

        return $trimmedContents === ''
            ? $line.PHP_EOL
            : $trimmedContents.PHP_EOL.$line.PHP_EOL;
    }
}
