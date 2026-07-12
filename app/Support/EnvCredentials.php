<?php

namespace App\Support;

class EnvCredentials
{
    public static function username(): string
    {
        return trim((string) env('ATTENDANCE_AUTH_USERNAME', 'admin'));
    }

    public static function password(): string
    {
        return (string) env('ATTENDANCE_AUTH_PASSWORD', 'admin123');
    }

    public static function signature(): string
    {
        return hash('sha256', self::username().'|'.self::password());
    }
}
