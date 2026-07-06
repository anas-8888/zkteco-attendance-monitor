<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{{ config('app.name', 'ZKTeco Monitor') }}</title>
        @vite(['resources/css/app.css', 'resources/js/app.js'])
    </head>
    <body class="bg-white text-zinc-950 antialiased">
        <main
            class="min-h-screen"
            data-attendance-dashboard
        >
            <section class="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
                <header class="flex flex-col gap-4 border-b border-zinc-200 pb-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p class="text-sm font-medium text-zinc-500">Attendance Monitor</p>
                        <h1 class="mt-1 text-2xl font-semibold text-zinc-950 sm:text-3xl">ZKTeco K Series Dashboard</h1>
                    </div>

                    <div class="grid gap-3 sm:grid-cols-2">
                        <div class="rounded-lg border border-zinc-200 bg-white px-4 py-3">
                            <p class="text-xs font-medium uppercase text-zinc-500">Device Status</p>
                            <p class="mt-1 flex items-center gap-2 text-sm font-semibold" data-device-status>
                                <span class="h-2.5 w-2.5 rounded-full bg-zinc-300"></span>
                                Checking
                            </p>
                        </div>
                        <div class="rounded-lg border border-zinc-200 bg-white px-4 py-3">
                            <p class="text-xs font-medium uppercase text-zinc-500">Last Sync Time</p>
                            <p class="mt-1 text-sm font-semibold text-zinc-900" data-last-sync>Not synced yet</p>
                        </div>
                    </div>
                </header>

                <section class="grid gap-4 md:grid-cols-3">
                    <article class="rounded-lg border border-zinc-200 bg-white p-5">
                        <p class="text-sm font-medium text-zinc-500">Today's Check-ins</p>
                        <p class="mt-3 text-3xl font-semibold text-emerald-700" data-total-check-ins>0</p>
                    </article>
                    <article class="rounded-lg border border-zinc-200 bg-white p-5">
                        <p class="text-sm font-medium text-zinc-500">Today's Check-outs</p>
                        <p class="mt-3 text-3xl font-semibold text-red-700" data-total-check-outs>0</p>
                    </article>
                    <article class="rounded-lg border border-zinc-200 bg-white p-5">
                        <p class="text-sm font-medium text-zinc-500">Total Records</p>
                        <p class="mt-3 text-3xl font-semibold text-zinc-950" data-total-records>0</p>
                    </article>
                </section>

                <section class="overflow-hidden rounded-lg border border-zinc-200 bg-white">
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-zinc-200 text-left">
                            <thead class="bg-zinc-50">
                                <tr>
                                    <th class="px-4 py-3 text-xs font-semibold uppercase text-zinc-500">Employee Name</th>
                                    <th class="px-4 py-3 text-xs font-semibold uppercase text-zinc-500">Device User ID</th>
                                    <th class="px-4 py-3 text-xs font-semibold uppercase text-zinc-500">Time</th>
                                    <th class="px-4 py-3 text-xs font-semibold uppercase text-zinc-500">State</th>
                                    <th class="px-4 py-3 text-xs font-semibold uppercase text-zinc-500">Verification Method</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-zinc-100" data-attendance-rows>
                                <tr>
                                    <td class="px-4 py-6 text-sm text-zinc-500" colspan="5">Loading today's attendance...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>
            </section>
        </main>
    </body>
</html>
