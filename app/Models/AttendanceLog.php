<?php

namespace App\Models;

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
}
