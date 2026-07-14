<!DOCTYPE html>
<html lang="en" dir="ltr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Installation Incomplete | Nexa Attendance Monitor</title>
        @vite(['resources/css/app.css'])
    </head>
    <body class="bg-slate-50 text-slate-900 antialiased">
        <main class="mx-auto flex min-h-screen w-full max-w-lg items-center px-4 py-6 sm:px-6">
            <section class="w-full rounded-lg border border-amber-200 bg-white p-6 shadow-sm">
                <div>
                    <p class="text-sm font-medium text-slate-500">Nexa Attendance Monitor</p>
                    <h1 class="mt-1 text-2xl font-semibold text-slate-950">Installation Incomplete</h1>
                    <p class="mt-2 text-sm text-slate-600">{{ $message }}</p>
                </div>

                <div class="alert-error mt-4">
                    Launch the installer again and complete the administrator account step before opening the app.
                </div>
            </section>
        </main>
    </body>
</html>
