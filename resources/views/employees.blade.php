<!DOCTYPE html>
<html lang="en" dir="ltr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <title>Employees</title>
        @vite(['resources/css/app.css'])
    </head>
    <body class="bg-slate-50 text-slate-900 antialiased">
        <main class="min-h-screen">
            <section class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
                @include('partials.app-navigation')

                <header class="flex flex-col gap-3 border-b border-slate-200 pb-6">
                    <div>
                        <p class="text-sm font-medium text-slate-500">Employees</p>
                        <h1 class="mt-1 text-2xl font-semibold text-slate-950">Employee Directory</h1>
                    </div>
                    <p class="max-w-3xl text-sm leading-6 text-slate-600">
                        Browse all employees, review their default or custom work schedule, and open each employee attendance report with one click.
                    </p>
                </header>

                <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div class="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p class="text-sm font-semibold text-slate-950">All Employees</p>
                            <p class="mt-1 text-sm text-slate-600">
                                Default working hours: {{ $defaultWorkingHours['start_time'] }} - {{ $defaultWorkingHours['end_time'] }}
                            </p>
                        </div>
                        <a
                            href="{{ route('working-hours') }}"
                            class="btn-secondary w-full text-center sm:w-auto"
                        >
                            Edit Working Hours
                        </a>
                    </div>

                    @if ($employees->isEmpty())
                        <div class="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                            <p class="text-sm font-medium text-slate-700">No employees found yet.</p>
                            <p class="mt-2 text-sm text-slate-500">Sync attendance or add employee data first, then come back here to browse the directory.</p>
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
                                        <th class="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Schedule</th>
                                        <th class="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Report</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100">
                                    @foreach ($employees as $employee)
                                        @php
                                            $workStart = $employee->work_start_time ?: $defaultWorkingHours['start_time'];
                                            $workEnd = $employee->work_end_time ?: $defaultWorkingHours['end_time'];
                                            $hasCustomHours = $employee->work_start_time && $employee->work_end_time;
                                        @endphp
                                        <tr class="bg-white">
                                            <td class="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-950">{{ $employee->name }}</td>
                                            <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{{ $employee->device_user_id }}</td>
                                            <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{{ $workStart }}</td>
                                            <td class="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{{ $workEnd }}</td>
                                            <td class="whitespace-nowrap px-4 py-3 text-sm">
                                                <span class="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold {{ $hasCustomHours ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-100 text-slate-700' }}">
                                                    {{ $hasCustomHours ? 'Custom Hours' : 'Default Hours' }}
                                                </span>
                                            </td>
                                            <td class="whitespace-nowrap px-4 py-3 text-sm">
                                                <a
                                                    href="{{ route('reports', ['employee_id' => $employee->device_user_id]) }}"
                                                    class="btn-secondary inline-flex h-9 items-center"
                                                >
                                                    View
                                                </a>
                                            </td>
                                        </tr>
                                    @endforeach
                                </tbody>
                            </table>
                        </div>
                    @endif
                </section>
            </section>
        </main>
    </body>
</html>
