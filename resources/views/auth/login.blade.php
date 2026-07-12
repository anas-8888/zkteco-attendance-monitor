<!DOCTYPE html>
<html lang="en" dir="ltr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Login | Nexa Attendance Monitor</title>
        @vite(['resources/css/app.css'])
    </head>
    <body class="bg-slate-50 text-slate-900 antialiased">
        <main class="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-6 sm:px-6">
            <section class="w-full rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                    <p class="text-sm font-medium text-slate-500">Nexa Attendance Monitor</p>
                    <h1 class="mt-1 text-2xl font-semibold text-slate-950">Sign In</h1>
                    <p class="mt-2 text-sm text-slate-600">Use the username and password defined in the environment settings.</p>
                </div>

                @if (session('auth_error'))
                    <div class="alert-error mt-4">
                        {{ session('auth_error') }}
                    </div>
                @endif

                @if ($errors->any())
                    <div class="alert-error mt-4">
                        {{ $errors->first() }}
                    </div>
                @endif

                <form method="POST" action="{{ route('login.store') }}" class="mt-6 space-y-4">
                    @csrf
                    <div>
                        <label for="username" class="form-label">Username</label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            value="{{ old('username') }}"
                            class="form-input w-full"
                            autocomplete="username"
                            required
                        >
                    </div>

                    <div>
                        <label for="password" class="form-label">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            class="form-input w-full"
                            autocomplete="current-password"
                            required
                        >
                    </div>

                    <button type="submit" class="btn-primary w-full">
                        Sign In
                    </button>
                </form>
            </section>
        </main>
    </body>
</html>
