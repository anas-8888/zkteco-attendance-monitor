<?php

namespace App\Services\Attendance;

use Illuminate\Support\Facades\Config;

class DeviceConnectionSettingsManager
{
    private const DEVICE_IP_KEY = 'ZKTECO_DEVICE_IP';
    private const DEVICE_PORT_KEY = 'ZKTECO_DEVICE_PORT';
    private const DEVICE_PROTOCOL_KEY = 'ZKTECO_PROTOCOL';

    /**
     * @return array{ip: string, port: int, protocol: string}
     */
    public function configuration(): array
    {
        return [
            'ip' => trim((string) config('attendance.device.ip', '192.168.1.201')),
            'port' => (int) config('attendance.device.port', 4370),
            'protocol' => trim((string) config('attendance.device.protocol', 'tcp')),
        ];
    }

    /**
     * @return array{ip: string, port: int, protocol: string}
     */
    public function updateIp(string $ipAddress): array
    {
        return $this->update($ipAddress, (int) config('attendance.device.port', 4370), (string) config('attendance.device.protocol', 'tcp'));
    }

    /**
     * @return array{ip: string, port: int, protocol: string}
     */
    public function update(string $ipAddress, int $port, string $protocol): array
    {
        $contents = is_file($this->envPath())
            ? (string) file_get_contents($this->envPath())
            : '';

        $contents = $this->upsertEnvValue($contents, self::DEVICE_IP_KEY, $ipAddress);
        $contents = $this->upsertEnvValue($contents, self::DEVICE_PORT_KEY, (string) $port);
        $contents = $this->upsertEnvValue($contents, self::DEVICE_PROTOCOL_KEY, $protocol);

        $directory = dirname($this->envPath());

        if (! is_dir($directory)) {
            mkdir($directory, 0777, true);
        }

        file_put_contents($this->envPath(), $contents);

        Config::set('attendance.device.ip', $ipAddress);
        Config::set('attendance.device.port', $port);
        Config::set('attendance.device.protocol', $protocol);

        return $this->configuration();
    }

    private function envPath(): string
    {
        return (string) config('attendance.device.env_path', base_path('.env'));
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
