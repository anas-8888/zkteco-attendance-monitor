<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_logs', function (Blueprint $table): void {
            $table->id();
            $table->string('device_user_id');
            $table->string('employee_name');
            $table->dateTime('timestamp');
            $table->string('state');
            $table->string('verification_type')->default('Unknown');
            $table->json('raw_data')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->unique(
                ['device_user_id', 'timestamp', 'state', 'verification_type'],
                'attendance_logs_device_unique'
            );
            $table->index(['timestamp', 'state']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_logs');
    }
};
