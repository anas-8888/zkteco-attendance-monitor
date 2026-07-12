<!DOCTYPE html>
<html lang="en" dir="ltr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <title>Employee Attendance & Payroll</title>
        @vite(['resources/css/app.css', 'resources/js/monthly-salary.js'])
    </head>
    <body class="bg-slate-50 text-slate-900 antialiased">
        <main
            class="min-h-screen"
            data-salary-page
            data-page-mode="{{ request()->routeIs('employee-attendance') || request()->routeIs('employee-profile') ? 'detail' : 'directory' }}"
            data-current-employee-id="{{ request()->route('employeeId') }}"
            data-directory-url="{{ route('salary-statistics') }}"
            data-detail-url-template="{{ route('employee-profile', ['employeeId' => 'EMPLOYEE_ID_PLACEHOLDER']) }}"
            data-initial-month=""
        >
            <section class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
                @include('partials.app-navigation')
                <div data-salary-status></div>
                <section data-salary-content class="pb-6">
                    <section class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                        <h1 class="text-2xl font-semibold text-slate-950">Loading employee attendance and payroll...</h1>
                        <p class="mt-3 text-sm leading-6 text-slate-600">Preparing the employee directory, attendance summaries, and payroll detail cards.</p>
                    </section>
                </section>
                <div data-settings-modal-root></div>
            </section>
        </main>
    </body>
</html>
