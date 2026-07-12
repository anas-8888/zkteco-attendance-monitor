<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('manual_attendance_entries', function (Blueprint $table): void {
            $table->id();
            $table->string('device_user_id');
            $table->string('employee_name');
            $table->dateTime('timestamp');
            $table->string('state');
            $table->string('verification_type')->default('Manual Entry');
            $table->string('note')->nullable();
            $table->timestamps();

            $table->unique(
                ['device_user_id', 'timestamp', 'state', 'verification_type'],
                'manual_attendance_entries_unique'
            );
            $table->index(['device_user_id', 'timestamp']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('manual_attendance_entries');
    }
};
