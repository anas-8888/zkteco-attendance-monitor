<!DOCTYPE html>
<html lang="en" dir="ltr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">
        <title>Nexa Attendance Monitor</title>
        @vite(['resources/css/app.css', 'resources/js/app.js'])
    </head>
    <body class="bg-slate-50 text-slate-900 antialiased">
        <main
            class="min-h-screen"
            data-attendance-dashboard
        >
            <section class="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
                @include('partials.app-navigation')

                <header class="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p class="text-sm font-medium text-slate-500">Attendance Monitor</p>
                        <h1 class="mt-1 text-2xl font-semibold text-slate-950 sm:text-3xl">Nexa Attendance Monitor</h1>
                    </div>

                    <div class="grid gap-3 sm:grid-cols-2">
                        <div class="rounded-lg border border-slate-200 bg-white px-4 py-3">
                            <p class="text-xs font-medium uppercase text-slate-500">Device Status</p>
                            <p class="mt-1 flex items-center gap-2 text-sm font-semibold" data-device-status>
                                <span class="h-2.5 w-2.5 rounded-full bg-slate-300"></span>
                                Checking
                            </p>
                        </div>
                        <div class="rounded-lg border border-slate-200 bg-white px-4 py-3">
                            <p class="text-xs font-medium uppercase text-slate-500">Last Sync Time</p>
                            <p class="mt-1 text-sm font-semibold text-slate-900" data-last-sync>Not synced yet</p>
                        </div>
                    </div>
                </header>

                <section class="grid gap-4 md:grid-cols-3">
                    <article class="rounded-lg border border-slate-200 bg-white p-5">
                        <p class="text-sm font-medium text-slate-500">Check-ins</p>
                        <p class="mt-3 text-3xl font-semibold text-emerald-700" data-total-check-ins>0</p>
                    </article>
                    <article class="rounded-lg border border-slate-200 bg-white p-5">
                        <p class="text-sm font-medium text-slate-500">Check-outs</p>
                        <p class="mt-3 text-3xl font-semibold text-rose-700" data-total-check-outs>0</p>
                    </article>
                    <article class="rounded-lg border border-slate-200 bg-white p-5">
                        <p class="text-sm font-medium text-slate-500">Total Records</p>
                        <p class="mt-3 text-3xl font-semibold text-slate-950" data-total-records>0</p>
                    </article>
                </section>

                <section class="overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <div class="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p class="text-xs font-medium uppercase text-slate-500">Displayed Date</p>
                            <p class="mt-1 text-sm font-semibold text-slate-950" data-selected-date-label>Loading...</p>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                            <div class="relative" data-date-picker-area>
                                <button
                                    type="button"
                                    class="inline-flex h-9 items-center rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                    data-date-picker-open
                                >
                                    Choose Date
                                </button>
                                <div
                                    class="absolute left-0 top-full z-20 mt-2 hidden w-80 rounded-lg border border-slate-200 bg-white p-4 shadow-lg"
                                    data-date-modal
                                    aria-hidden="true"
                                >
                                    <div class="flex items-start justify-between gap-4">
                                        <div>
                                            <p class="text-sm font-semibold text-slate-950">Choose Date</p>
                                            <p class="mt-1 text-sm text-slate-500">Select the attendance date you want to view.</p>
                                        </div>
                                        <button
                                            type="button"
                                            class="inline-flex h-8 items-center rounded-md px-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                                            data-date-modal-close
                                            aria-label="Close date picker"
                                        >
                                            Close
                                        </button>
                                    </div>

                                    <form class="mt-4 space-y-4" data-date-form>
                                        <div>
                                            <label for="attendance-date" class="block text-sm font-medium text-slate-700">Attendance Date</label>
                                            <input
                                                id="attendance-date"
                                                type="date"
                                                class="mt-2 block h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                                data-date-input
                                            >
                                        </div>

                                        <div class="flex items-center justify-end gap-2">
                                            <button
                                                type="button"
                                                class="inline-flex h-10 items-center rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                                data-date-modal-close
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                class="inline-flex h-10 items-center rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>

                            <div data-summary-picker-area>
                                <button
                                    type="button"
                                    class="inline-flex h-9 items-center rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                    data-manual-check-in-open
                                >
                                    Manual Check-in
                                </button>
                            </div>

                            <div data-summary-picker-area>
                                <button
                                    type="button"
                                    class="inline-flex h-9 items-center rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                    data-manual-check-out-open
                                >
                                    Manual Check-out
                                </button>
                            </div>

                            <div data-summary-picker-area>
                                <button
                                    type="button"
                                    class="inline-flex h-9 items-center rounded-md bg-slate-950 px-3 text-sm font-medium text-white transition hover:bg-slate-800"
                                    data-summary-open
                                >
                                    Attendance Summary
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-slate-200 text-left">
                            <thead class="bg-slate-50">
                                <tr>
                                    <th class="px-4 py-3 text-xs font-semibold uppercase text-slate-500">User ID</th>
                                    <th class="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Employee Name</th>
                                    <th class="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Check-in Time</th>
                                    <th class="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Check-out Time</th>
                                    <th class="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Attendance Duration</th>
                                    <th class="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Late Check-in</th>
                                    <th class="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Check-in Method</th>
                                    <th class="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Date</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100" data-attendance-rows>
                                <tr>
                                    <td class="px-4 py-6 text-sm text-slate-500" colspan="8">Loading attendance...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <div
                    class="fixed inset-0 z-40 hidden items-center justify-center bg-slate-950/45 px-4 py-6"
                    data-manual-check-in-modal
                    aria-hidden="true"
                >
                    <div class="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-5 shadow-xl" data-manual-check-in-panel>
                        <div class="flex items-start justify-between gap-4">
                            <div>
                                <p class="text-sm font-semibold text-slate-950">Manual Check-in</p>
                                <p class="mt-1 text-sm text-slate-500">Create a manual check-in when an employee forgot to punch in on the device.</p>
                            </div>
                            <button
                                type="button"
                                class="inline-flex h-8 items-center rounded-md px-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                                data-manual-check-in-close
                            >
                                Close
                            </button>
                        </div>

                        <form class="mt-4 space-y-4" data-manual-check-in-form>
                            <div>
                                <label for="manual-check-in-user" class="block text-sm font-medium text-slate-700">User</label>
                                <select
                                    id="manual-check-in-user"
                                    class="mt-2 block h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                    data-manual-check-in-user
                                >
                                    <option value="">Choose a user</option>
                                </select>
                            </div>

                            <div class="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label for="manual-check-in-date" class="block text-sm font-medium text-slate-700">Attendance Date</label>
                                    <input
                                        id="manual-check-in-date"
                                        type="date"
                                        class="mt-2 block h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                        data-manual-check-in-date
                                    >
                                </div>
                                <div>
                                    <label for="manual-check-in-time" class="block text-sm font-medium text-slate-700">Check-in Time</label>
                                    <input
                                        id="manual-check-in-time"
                                        type="time"
                                        class="mt-2 block h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                        data-manual-check-in-time
                                    >
                                </div>
                            </div>

                            <div>
                                <label for="manual-check-in-note" class="block text-sm font-medium text-slate-700">Note</label>
                                <input
                                    id="manual-check-in-note"
                                    type="text"
                                    maxlength="255"
                                    class="mt-2 block h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                    placeholder="Optional note"
                                    data-manual-check-in-note
                                >
                            </div>

                            <div class="rounded-lg border border-slate-200 bg-slate-50 p-4" data-manual-check-in-result>
                                <p class="text-sm text-slate-500">Select the employee, date, and check-in time to add a manual attendance record.</p>
                            </div>

                            <div class="flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    class="inline-flex h-10 items-center rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                    data-manual-check-in-close
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    class="inline-flex h-10 items-center rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                                    data-manual-check-in-submit
                                >
                                    Save Check-in
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <div
                    class="fixed inset-0 z-40 hidden items-center justify-center bg-slate-950/45 px-4 py-6"
                    data-manual-check-out-modal
                    aria-hidden="true"
                >
                    <div class="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-5 shadow-xl" data-manual-check-out-panel>
                        <div class="flex items-start justify-between gap-4">
                            <div>
                                <p class="text-sm font-semibold text-slate-950">Manual Check-out</p>
                                <p class="mt-1 text-sm text-slate-500">Create a manual check-out when an employee forgot to punch out on the device.</p>
                            </div>
                            <button
                                type="button"
                                class="inline-flex h-8 items-center rounded-md px-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                                data-manual-check-out-close
                            >
                                Close
                            </button>
                        </div>

                        <form class="mt-4 space-y-4" data-manual-check-out-form>
                            <div>
                                <label for="manual-check-out-user" class="block text-sm font-medium text-slate-700">User</label>
                                <select
                                    id="manual-check-out-user"
                                    class="mt-2 block h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                    data-manual-check-out-user
                                >
                                    <option value="">Choose a user</option>
                                </select>
                            </div>

                            <div class="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label for="manual-check-out-date" class="block text-sm font-medium text-slate-700">Attendance Date</label>
                                    <input
                                        id="manual-check-out-date"
                                        type="date"
                                        class="mt-2 block h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                        data-manual-check-out-date
                                    >
                                </div>
                                <div>
                                    <label for="manual-check-out-time" class="block text-sm font-medium text-slate-700">Check-out Time</label>
                                    <input
                                        id="manual-check-out-time"
                                        type="time"
                                        class="mt-2 block h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                        data-manual-check-out-time
                                    >
                                </div>
                            </div>

                            <div>
                                <label for="manual-check-out-note" class="block text-sm font-medium text-slate-700">Note</label>
                                <input
                                    id="manual-check-out-note"
                                    type="text"
                                    maxlength="255"
                                    class="mt-2 block h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                    placeholder="Optional note"
                                    data-manual-check-out-note
                                >
                            </div>

                            <div class="rounded-lg border border-slate-200 bg-slate-50 p-4" data-manual-check-out-result>
                                <p class="text-sm text-slate-500">Select the employee, date, and check-out time to add a manual attendance record.</p>
                            </div>

                            <div class="flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    class="inline-flex h-10 items-center rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                    data-manual-check-out-close
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    class="inline-flex h-10 items-center rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                                    data-manual-check-out-submit
                                >
                                    Save Check-out
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <div
                    class="fixed inset-0 z-40 hidden items-center justify-center bg-slate-950/45 px-4 py-6"
                    data-summary-modal
                    aria-hidden="true"
                >
                    <div class="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-5 shadow-xl" data-summary-panel>
                        <div class="flex items-start justify-between gap-4">
                            <div>
                                <p class="text-sm font-semibold text-slate-950">Attendance Summary</p>
                                <p class="mt-1 text-sm text-slate-500">Calculate totals for any date range.</p>
                            </div>
                            <button
                                type="button"
                                class="inline-flex h-8 items-center rounded-md px-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                                data-summary-close
                            >
                                Close
                            </button>
                        </div>

                        <form class="mt-4 space-y-4" data-summary-form>
                            <div>
                                <label for="summary-user" class="block text-sm font-medium text-slate-700">User</label>
                                <select
                                    id="summary-user"
                                    class="mt-2 block h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                    data-summary-user
                                >
                                    <option value="">Choose a user</option>
                                </select>
                            </div>

                            <div class="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label for="summary-from-date" class="block text-sm font-medium text-slate-700">From Date</label>
                                    <input
                                        id="summary-from-date"
                                        type="date"
                                        class="mt-2 block h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                        data-summary-from-date
                                    >
                                </div>
                                <div>
                                    <label for="summary-to-date" class="block text-sm font-medium text-slate-700">To Date</label>
                                    <input
                                        id="summary-to-date"
                                        type="date"
                                        class="mt-2 block h-11 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                        data-summary-to-date
                                    >
                                </div>
                            </div>

                            <div class="flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    class="inline-flex h-10 items-center rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                    data-summary-close
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    class="inline-flex h-10 items-center rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                                    data-summary-submit
                                >
                                    Calculate
                                </button>
                            </div>
                        </form>

                        <div class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4" data-summary-result>
                            <p class="text-sm text-slate-500">Choose a user and date range to calculate the summary.</p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    </body>
</html>
