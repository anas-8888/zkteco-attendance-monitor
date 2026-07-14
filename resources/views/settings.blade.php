<!DOCTYPE html>
<html lang="en" dir="ltr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <title>Settings</title>
        @vite(['resources/css/app.css', 'resources/js/settings.js', 'resources/js/working-hours.js'])
    </head>
    <body class="bg-slate-50 text-slate-900 antialiased">
        <main class="min-h-screen" data-settings-page>
            <section class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
                @include('partials.app-navigation')

                <header class="flex flex-col gap-3 border-b border-slate-200 pb-6">
                    <div>
                        <p class="text-sm font-medium text-slate-500">Settings</p>
                        <h1 class="mt-1 text-2xl font-semibold text-slate-950">Device And Work Schedule</h1>
                    </div>
                    <p class="max-w-3xl text-sm leading-6 text-slate-600">
                        Change the device IP here if the router gives the attendance machine a new address, and set the default start and end time of work from the same page.
                    </p>
                </header>

                <section class="grid gap-6 xl:grid-cols-2">
                    <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                        <div class="flex flex-col gap-2 border-b border-slate-200 pb-4">
                            <p class="text-sm font-semibold text-slate-950">Current Device Address</p>
                            <p class="text-sm text-slate-600" data-device-settings-summary>
                                Device IP: {{ $deviceSettings['ip'] }} | Port: {{ $deviceSettings['port'] }} | Protocol: {{ strtoupper($deviceSettings['protocol']) }}
                            </p>
                        </div>

                        <form class="mt-5 space-y-4" data-device-settings-form>
                            <div class="grid gap-3 sm:grid-cols-2">
                                <label class="block sm:col-span-2">
                                    <span class="form-label">Device IP Address</span>
                                    <input
                                        type="text"
                                        class="form-input w-full"
                                        value="{{ $deviceSettings['ip'] }}"
                                        placeholder="192.168.1.201"
                                        data-device-ip
                                    >
                                </label>

                                <label class="block">
                                    <span class="form-label">Port</span>
                                    <input
                                        type="number"
                                        min="1"
                                        max="65535"
                                        class="form-input w-full"
                                        value="{{ $deviceSettings['port'] }}"
                                        data-device-port
                                    >
                                </label>

                                <label class="block">
                                    <span class="form-label">Protocol</span>
                                    <select class="form-input w-full" data-device-protocol>
                                        <option value="auto" {{ $deviceSettings['protocol'] === 'auto' ? 'selected' : '' }}>Auto (Recommended)</option>
                                        <option value="tcp" {{ $deviceSettings['protocol'] === 'tcp' ? 'selected' : '' }}>TCP</option>
                                        <option value="udp" {{ $deviceSettings['protocol'] === 'udp' ? 'selected' : '' }}>UDP</option>
                                    </select>
                                </label>
                            </div>

                            <div class="rounded-lg border border-slate-200 bg-slate-50 p-4" data-device-settings-result>
                                <p class="text-sm text-slate-500">Current configured device connection: {{ $deviceSettings['ip'] }}:{{ $deviceSettings['port'] }} over {{ strtoupper($deviceSettings['protocol']) }}. Use Auto if you are not sure whether the machine expects TCP or UDP.</p>
                            </div>

                            <div class="flex flex-wrap items-center justify-between gap-3">
                                <button
                                    type="submit"
                                    class="btn-primary w-full sm:w-auto"
                                    data-device-settings-submit
                                >
                                    Save Device Connection
                                </button>
                            </div>
                        </form>
                    </section>

                    <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                        <div class="border-b border-slate-200 pb-4">
                            <p class="text-sm font-semibold text-slate-950">How It Works</p>
                            <p class="mt-1 text-sm text-slate-600">Use this page when the attendance device IP or the default work schedule changes.</p>
                        </div>

                        <div class="mt-4 space-y-4 text-sm text-slate-600">
                            <p>The app is currently configured to connect to <span class="font-semibold text-slate-950">{{ $deviceSettings['ip'] }}:{{ $deviceSettings['port'] }}</span> using <span class="font-semibold text-slate-950">{{ strtoupper($deviceSettings['protocol']) }}</span>.</p>
                            <p>If your router assigned the device a different address, or your machine expects a different protocol, update the connection settings here and save them.</p>
                            <p>The default workday is currently <span class="font-semibold text-slate-950">{{ $workingHours['start_time'] }} - {{ $workingHours['end_time'] }}</span>, with off days on <span class="font-semibold text-slate-950">{{ implode(', ', $workingHours['off_day_labels']) }}</span>.</p>
                            <p>The app will use the new connection settings and default hours after saving. If the app is already open and still shows old data, refresh or restart it once.</p>
                        </div>
                    </section>
                </section>

                <section class="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]" data-working-hours-page>
                    <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                        <div class="flex flex-col gap-2 border-b border-slate-200 pb-4">
                            <p class="text-sm font-semibold text-slate-950">Default Work Schedule</p>
                            <p class="text-sm text-slate-600" data-default-hours-summary>
                                Default working hours: {{ $workingHours['start_time'] }} - {{ $workingHours['end_time'] }} | Off days: {{ implode(', ', $workingHours['off_day_labels']) }}
                            </p>
                        </div>

                        <form class="mt-5 space-y-4" data-default-hours-form>
                            <div class="grid gap-3 sm:grid-cols-2">
                                <label class="block">
                                    <span class="form-label">Work Start</span>
                                    <input
                                        type="time"
                                        class="form-input w-full"
                                        value="{{ $workingHours['start_time'] }}"
                                        data-default-work-start
                                    >
                                </label>

                                <label class="block">
                                    <span class="form-label">Work End</span>
                                    <input
                                        type="time"
                                        class="form-input w-full"
                                        value="{{ $workingHours['end_time'] }}"
                                        data-default-work-end
                                    >
                                </label>
                            </div>

                            <div>
                                <span class="form-label">Weekly Off Days</span>
                                <div class="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                    @foreach (\App\Services\Attendance\DefaultWorkingHoursManager::weekdayLabels() as $dayIndex => $dayLabel)
                                        <label class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                                            <input
                                                type="checkbox"
                                                class="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-400"
                                                value="{{ $dayIndex }}"
                                                data-default-off-day
                                                {{ in_array($dayIndex, $workingHours['off_days'], true) ? 'checked' : '' }}
                                            >
                                            <span>{{ $dayLabel }}</span>
                                        </label>
                                    @endforeach
                                </div>
                                <p class="mt-2 text-xs text-slate-500">Late check-in and missing attendance are not counted on these days.</p>
                            </div>

                            <div class="rounded-lg border border-slate-200 bg-slate-50 p-4" data-default-hours-result>
                                <p class="text-sm text-slate-500">Save the default workday and weekly off days here, then use the reports page only for employees who need a different schedule.</p>
                            </div>

                            <div class="flex flex-wrap items-center justify-between gap-3">
                                <a
                                    href="{{ route('reports') }}"
                                    class="btn-secondary w-full text-center sm:w-auto"
                                >
                                    Customize Employee Hours
                                </a>
                                <button
                                    type="submit"
                                    class="btn-primary w-full sm:w-auto"
                                    data-default-hours-submit
                                >
                                    Save Default Hours
                                </button>
                            </div>
                        </form>
                    </section>

                    <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                        <div class="border-b border-slate-200 pb-4">
                            <p class="text-sm font-semibold text-slate-950">Employees With Custom Hours</p>
                            <p class="mt-1 text-sm text-slate-600">These employees keep their own start and end times even after you change the default schedule.</p>
                        </div>

                        @if ($customEmployees->isEmpty())
                            <div class="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                                <p class="text-sm font-medium text-slate-700">No custom employee schedules yet.</p>
                                <p class="mt-2 text-sm text-slate-500">Use the Reports page if one employee needs different hours than the default workday.</p>
                            </div>
                        @else
                            <div class="mt-4 overflow-x-auto">
                                <table class="min-w-full divide-y divide-slate-200 text-left">
                                    <thead class="bg-slate-50">
                                        <tr>
                                            <th class="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Employee</th>
                                            <th class="px-4 py-3 text-xs font-semibold uppercase text-slate-500">User ID</th>
                                            <th class="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Work Start</th>
                                            <th class="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Work End</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100">
                                        @foreach ($customEmployees as $employee)
                                            <tr class="bg-white">
                                                <td class="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-950">{{ $employee->name }}</td>
                                                <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{{ $employee->device_user_id }}</td>
                                                <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{{ $employee->work_start_time }}</td>
                                                <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{{ $employee->work_end_time }}</td>
                                            </tr>
                                        @endforeach
                                    </tbody>
                                </table>
                            </div>
                        @endif
                    </section>
                </section>
            </section>
        </main>
    </body>
</html>
