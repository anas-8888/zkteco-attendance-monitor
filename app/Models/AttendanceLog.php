<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AttendanceLog extends Model
{
    /** @use HasFactory<\Database\Factories\AttendanceLogFactory> */
    use HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = [
        'device_user_id',
        'employee_name',
        'timestamp',
        'state',
        'verification_type',
        'raw_data',
    ];

    protected function casts(): array
    {
        return [
            'timestamp' => 'datetime',
            'raw_data' => 'array',
        ];
    }

    public function scopeToday(Builder $query): Builder
    {
        return $query->whereBetween('timestamp', [now()->startOfDay(), now()->endOfDay()]);
    }

    public function scopeTrusted(Builder $query): Builder
    {
        $toleranceSeconds = max(0, (int) config('attendance.device.future_timestamp_tolerance_seconds', 43200));
        $driver = $query->getConnection()->getDriverName();

        return $query->where(function (Builder $builder) use ($driver, $toleranceSeconds): void {
            $builder->whereNull('created_at');

            if ($driver === 'sqlite') {
                $builder->orWhereRaw(
                    'julianday("timestamp") <= julianday("created_at") + (? / 86400.0)',
                    [$toleranceSeconds]
                );

                return;
            }

            $builder->orWhereRaw(
                sprintf('`timestamp` <= DATE_ADD(`created_at`, INTERVAL %d SECOND)', $toleranceSeconds)
            );
        });
    }

    public function scopeOnDate(Builder $query, CarbonInterface $date): Builder
    {
        return $query
            ->trusted()
            ->whereBetween('timestamp', [
                $date->copy()->startOfDay(),
                $date->copy()->endOfDay(),
            ]);
    }
}
