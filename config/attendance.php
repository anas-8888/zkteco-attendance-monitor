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
    ],
];
