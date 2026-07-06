<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Attendance\Contracts\AttendanceDeviceClient;
use Illuminate\Http\JsonResponse;

class DeviceStatusController extends Controller
{
    public function __invoke(AttendanceDeviceClient $device): JsonResponse
    {
        return response()->json($device->status()->toArray());
    }
}
