<nav class="rounded-lg border border-slate-200 bg-white px-4 py-3">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
            <p class="text-sm font-medium text-slate-900">Nexa Attendance Monitor</p>
            <p class="text-sm text-slate-500">Secure Attendance Tools</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
            <button
                type="button"
                data-page-refresh
                class="inline-flex h-9 items-center rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
                Refresh
            </button>
            <a
                href="{{ route('dashboard') }}"
                class="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition {{ request()->routeIs('dashboard') ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50' }}"
            >
                Live Dashboard
            </a>
            <a
                href="{{ route('reports') }}"
                class="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition {{ request()->routeIs('reports') ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50' }}"
            >
                Reports
            </a>
            <a
                href="{{ route('employees') }}"
                class="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition {{ request()->routeIs('employees') ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50' }}"
            >
                Employees
            </a>
            <a
                href="{{ route('settings') }}"
                class="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition {{ request()->routeIs('settings') ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50' }}"
            >
                Settings
            </a>
            <form method="POST" action="{{ route('login.destroy') }}">
                @csrf
                <button
                    type="submit"
                    class="inline-flex h-9 items-center rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                    Logout
                </button>
            </form>
        </div>
    </div>
</nav>
