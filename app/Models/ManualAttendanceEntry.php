<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ManualAttendanceEntry extends Model
{
    /** @use HasFactory<\Database\Factories\ManualAttendanceEntryFactory> */
    use HasFactory;

    protected $fillable = [
        'device_user_id',
        'employee_name',
        'timestamp',
        'state',
        'verification_type',
        'note',
    ];

    protected function casts(): array
    {
        return [
            'timestamp' => 'datetime',
        ];
    }
}
