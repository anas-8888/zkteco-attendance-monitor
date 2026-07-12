<!DOCTYPE html>
<html lang="en" dir="ltr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <title>Attendance Reports</title>
        @vite(['resources/css/app.css', 'resources/js/reports.js'])
    </head>
    <body class="bg-slate-50 text-slate-900 antialiased">
        <main class="min-h-screen" data-reports-page>
            <section class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
                @include('partials.app-navigation')

                <header class="flex flex-col gap-3 border-b border-slate-200 pb-6">
                    <div>
                        <p class="text-sm font-medium text-slate-500">Attendance Reports</p>
                        <h1 class="mt-1 text-2xl font-semibold text-slate-950">Employee Attendance Report</h1>
                    </div>
                    <p class="max-w-3xl text-sm leading-6 text-slate-600">
                        Select an employee and a date range to review attendance sessions and total attendance duration.
                    </p>
                </header>

                <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <form class="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]" data-report-form>
                        <label class="block">
                            <span class="form-label">Employee</span>
                            <select class="form-input w-full" data-report-user>
                                <option value="">Choose an employee</option>
                                @foreach ($employees as $employee)
                                    <option
                                        value="{{ $employee->device_user_id }}"
                                        data-work-start="{{ $employee->work_start_time ?: config('attendance.schedule.start_time') }}"
                                        data-work-end="{{ $employee->work_end_time ?: config('attendance.schedule.end_time') }}"
                                        data-has-custom-hours="{{ $employee->work_start_time && $employee->work_end_time ? 'true' : 'false' }}"
                                    >
                                        {{ $employee->name }} ({{ $employee->device_user_id }})
                                    </option>
                                @endforeach
                            </select>
                        </label>

                        <label class="block">
                            <span class="form-label">From Date</span>
                            <input type="date" class="form-input w-full" data-report-from>
                        </label>

                        <label class="block">
                            <span class="form-label">To Date</span>
                            <input type="date" class="form-input w-full" data-report-to>
                        </label>

                        <div class="flex items-end">
                            <button type="submit" class="btn-primary w-full md:w-auto" data-report-submit>
                                Run Report
                            </button>
                        </div>
                    </form>

                    <div class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                        <p class="text-sm text-slate-600" data-working-hours-summary>
                            Default working hours: {{ config('attendance.schedule.start_time') }} - {{ config('attendance.schedule.end_time') }}
                        </p>
                        <button
                            type="button"
                            class="btn-secondary w-full sm:w-auto"
                            data-working-hours-open
                        >
                            Customize Employee Hours
                        </button>
                    </div>
                </section>

                <div data-report-status></div>
                <section data-report-content></section>

                <div
                    class="fixed inset-0 z-40 hidden items-center justify-center bg-slate-950/45 px-4 py-6"
                    data-working-hours-modal
                    aria-hidden="true"
                >
                    <div class="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl" data-working-hours-panel>
                        <div class="flex items-start justify-between gap-4">
                            <div>
                                <p class="text-sm font-semibold text-slate-950">Customize Employee Hours</p>
                                <p class="mt-1 text-sm text-slate-500">Set special working hours for one employee without changing the default schedule for everyone else.</p>
                            </div>
                            <button
                                type="button"
                                class="inline-flex h-8 items-center rounded-md px-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                                data-working-hours-close
                            >
                                Close
                            </button>
                        </div>

                        <form class="mt-4 space-y-4" data-working-hours-form>
                            <div>
                                <label class="form-label" for="working-hours-employee">Employee</label>
                                <input
                                    id="working-hours-employee"
                                    type="text"
                                    class="form-input w-full bg-slate-50"
                                    data-working-hours-employee
                                    readonly
                                >
                            </div>

                            <div class="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label class="form-label" for="working-hours-start">Work Start</label>
                                    <input
                                        id="working-hours-start"
                                        type="time"
                                        class="form-input w-full"
                                        data-working-hours-start
                                    >
                                </div>
                                <div>
                                    <label class="form-label" for="working-hours-end">Work End</label>
                                    <input
                                        id="working-hours-end"
                                        type="time"
                                        class="form-input w-full"
                                        data-working-hours-end
                                    >
                                </div>
                            </div>

                            <div class="rounded-lg border border-slate-200 bg-slate-50 p-4" data-working-hours-result>
                                <p class="text-sm text-slate-500">Choose an employee first, then set the custom hours you want to use for late check-in calculations.</p>
                            </div>

                            <div class="flex flex-wrap items-center justify-between gap-2">
                                <button
                                    type="button"
                                    class="btn-secondary"
                                    data-working-hours-reset
                                >
                                    Use Default Hours
                                </button>
                                <div class="flex items-center gap-2">
                                    <button
                                        type="button"
                                        class="btn-secondary"
                                        data-working-hours-close
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        class="btn-primary"
                                        data-working-hours-submit
                                    >
                                        Save Hours
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </section>
        </main>
    </body>
</html>
