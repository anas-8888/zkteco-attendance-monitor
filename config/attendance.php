<?php

return [
    'device' => [
        'ip' => env('ZKTECO_DEVICE_IP', '192.168.1.201'),
        'port' => (int) env('ZKTECO_DEVICE_PORT', 4370),
        'password' => (int) env('ZKTECO_COMMUNICATION_PASSWORD', 0),
        'protocol' => env('ZKTECO_PROTOCOL', 'tcp'),
        'timeout' => (int) env('ZKTECO_TIMEOUT', 25),
        'should_ping' => (bool) env('ZKTECO_SHOULD_PING', false),
        'polling_interval' => (int) env('ATTENDANCE_POLLING_INTERVAL', 60),
        'attendance_state_field' => env('ZKTECO_ATTENDANCE_STATE_FIELD', 'auto'),
        'verification_field' => env('ZKTECO_VERIFICATION_FIELD', 'auto'),
        'future_timestamp_tolerance_seconds' => (int) env('ATTENDANCE_FUTURE_TOLERANCE_SECONDS', 43200),
        'manual_duplicate_window_seconds' => (int) env('ATTENDANCE_MANUAL_DUPLICATE_WINDOW_SECONDS', 900),
        'env_path' => env('ATTENDANCE_DEVICE_ENV_PATH', base_path('.env')),
    ],
    'schedule' => [
        'start_time' => env('ATTENDANCE_WORK_START', '10:00'),
        'end_time' => env('ATTENDANCE_WORK_END', '18:00'),
        'off_days' => env('ATTENDANCE_OFF_DAYS', '0'),
        'env_path' => env('ATTENDANCE_SCHEDULE_ENV_PATH', base_path('.env')),
    ],
];
