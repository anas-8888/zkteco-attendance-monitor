<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Attendance\AttendanceDashboardPayloadFactory;
use App\Services\Attendance\AttendanceLogSynchronizer;
use Illuminate\Http\JsonResponse;

class AttendanceController extends Controller
{
    public function __construct(
        private readonly AttendanceDashboardPayloadFactory $payloadFactory,
    ) {
    }

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => $this->payloadFactory->make()['totals']['records'],
        ]);
    }

    public function today(): JsonResponse
    {
        return response()->json($this->payloadFactory->make()['totals']);
    }

    public function dashboard(AttendanceLogSynchronizer $synchronizer): JsonResponse
    {
        $sync = $synchronizer->syncIfDue();
        $payload = $this->payloadFactory->make();

        if ($sync['error']) {
            $payload['sync_error'] = $sync['error'];
        }

        return response()->json($payload, 200, [
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }
}
