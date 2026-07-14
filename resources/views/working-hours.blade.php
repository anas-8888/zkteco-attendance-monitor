<!DOCTYPE html>
<html lang="en" dir="ltr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <title>Working Hours</title>
        @vite(['resources/css/app.css', 'resources/js/working-hours.js'])
    </head>
    <body class="bg-slate-50 text-slate-900 antialiased">
        <main class="min-h-screen" data-working-hours-page>
            <section class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
                @include('partials.app-navigation')

                <header class="flex flex-col gap-3 border-b border-slate-200 pb-6">
                    <div>
                        <p class="text-sm font-medium text-slate-500">Working Hours</p>
                        <h1 class="mt-1 text-2xl font-semibold text-slate-950">Default Work Schedule</h1>
                    </div>
                    <p class="max-w-3xl text-sm leading-6 text-slate-600">
                        Set the default start and end times used for attendance and late check-in calculations. Employees with special schedules can still keep their own custom hours from the reports page.
                    </p>
                </header>

                <section class="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                    <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                        <div class="flex flex-col gap-2 border-b border-slate-200 pb-4">
                            <p class="text-sm font-semibold text-slate-950">Default Schedule</p>
                            <p class="text-sm text-slate-600" data-default-hours-summary>
                                Default working hours: {{ $workingHours['start_time'] }} - {{ $workingHours['end_time'] }}
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

                            <div class="rounded-lg border border-slate-200 bg-slate-50 p-4" data-default-hours-result>
                                <p class="text-sm text-slate-500">Save the default workday here, then use the reports page only for employees who need a different schedule.</p>
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
