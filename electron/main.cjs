const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('node:child_process');
const { existsSync } = require('node:fs');
const { cp, mkdir, readFile, writeFile } = require('node:fs/promises');
const path = require('node:path');
const process = require('node:process');

const repoRoot = path.resolve(__dirname, '..');
const appPort = Number.parseInt(process.env.ELECTRON_APP_PORT ?? '9510', 10);
const runtimeBuildIdFile = '.nexa-runtime-build-id';
const runtimeRequiredFiles = [
    'artisan',
    'public/index.php',
    'vendor/autoload.php',
    'vendor/composer/autoload_real.php',
    'vendor/symfony/string/Resources/functions.php',
    'vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php',
];
let mainWindow = null;
let phpServerProcess = null;
let phpServerOutput = [];

function appIconPath() {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, 'assets', 'icon.ico');
    }

    return path.join(repoRoot, 'build', 'icon.ico');
}

const shouldSkipCopy = (relativePath) => {
    const normalized = relativePath.replaceAll('\\', '/');

    return normalized === '.env'
        || normalized === 'database/database.sqlite'
        || normalized.startsWith('storage/')
        || normalized === 'storage';
};

async function copyDirectoryPreservingUserData(source, destination) {
    await mkdir(destination, { recursive: true });

    await cp(source, destination, {
        recursive: true,
        force: true,
        filter: (sourcePath) => {
            const relativePath = path.relative(source, sourcePath);

            if (!relativePath) {
                return true;
            }

            return !shouldSkipCopy(relativePath);
        },
    });
}

async function copyIfMissing(source, destination) {
    if (!existsSync(source) || existsSync(destination)) {
        return;
    }

    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination, { recursive: true, force: true });
}

async function synchronizeRuntimeEnv(runtimeRoot) {
    const envPath = path.join(runtimeRoot, '.env');
    let envContents = existsSync(envPath)
        ? await readFile(envPath, 'utf8')
        : '';

    const setEnvValue = (contents, key, value) => {
        const pattern = new RegExp(`^${key}=.*$`, 'm');
        const nextLine = `${key}=${value}`;

        if (pattern.test(contents)) {
            return contents.replace(pattern, nextLine);
        }

        return `${contents.trimEnd()}\n${nextLine}\n`;
    };

    envContents = setEnvValue(envContents, 'APP_NAME', '"Nexa Attendance Monitor"');
    envContents = setEnvValue(envContents, 'APP_URL', `http://127.0.0.1:${appPort}`);
    envContents = setEnvValue(envContents, 'SESSION_DRIVER', 'file');
    envContents = setEnvValue(envContents, 'CACHE_STORE', 'file');
    envContents = setEnvValue(envContents, 'QUEUE_CONNECTION', 'sync');
    envContents = setEnvValue(
        envContents,
        'DB_DATABASE',
        path.join(runtimeRoot, 'database', 'database.sqlite').replaceAll('\\', '/')
    );

    await writeFile(envPath, envContents, 'utf8');
}

function missingRuntimeFiles(runtimeRoot) {
    return runtimeRequiredFiles.filter((relativePath) => !existsSync(path.join(runtimeRoot, relativePath)));
}

async function ensureRuntimeWorkspace() {
    if (!app.isPackaged) {
        return repoRoot;
    }

    const sourceRoot = path.join(process.resourcesPath, 'laravel-app');
    const runtimeRoot = path.join(app.getPath('userData'), 'laravel-runtime');
    const sourceBuildIdPath = path.join(sourceRoot, runtimeBuildIdFile);
    const runtimeBuildIdPath = path.join(runtimeRoot, runtimeBuildIdFile);
    const sourceBuildId = existsSync(sourceBuildIdPath)
        ? (await readFile(sourceBuildIdPath, 'utf8')).trim()
        : app.getVersion();
    const existingBuildId = existsSync(runtimeBuildIdPath)
        ? (await readFile(runtimeBuildIdPath, 'utf8')).trim()
        : '';

    if (!existsSync(runtimeRoot)) {
        await mkdir(runtimeRoot, { recursive: true });
    }

    const integrityIssuesBeforeCopy = missingRuntimeFiles(runtimeRoot);
    const shouldRefreshRuntime = !existsSync(path.join(runtimeRoot, 'artisan'))
        || existingBuildId !== sourceBuildId
        || integrityIssuesBeforeCopy.length > 0;

    if (shouldRefreshRuntime) {
        await copyDirectoryPreservingUserData(sourceRoot, runtimeRoot);
        await copyIfMissing(path.join(sourceRoot, '.env'), path.join(runtimeRoot, '.env'));
        await copyIfMissing(path.join(sourceRoot, 'database', 'database.sqlite'), path.join(runtimeRoot, 'database', 'database.sqlite'));
        await mkdir(path.join(runtimeRoot, 'storage', 'app'), { recursive: true });
        await mkdir(path.join(runtimeRoot, 'storage', 'framework', 'cache'), { recursive: true });
        await mkdir(path.join(runtimeRoot, 'storage', 'framework', 'sessions'), { recursive: true });
        await mkdir(path.join(runtimeRoot, 'storage', 'framework', 'testing'), { recursive: true });
        await mkdir(path.join(runtimeRoot, 'storage', 'framework', 'views'), { recursive: true });
        await mkdir(path.join(runtimeRoot, 'storage', 'logs'), { recursive: true });
        await writeFile(runtimeBuildIdPath, sourceBuildId, 'utf8');
    }

    const integrityIssuesAfterCopy = missingRuntimeFiles(runtimeRoot);

    if (integrityIssuesAfterCopy.length > 0) {
        throw new Error(
            `The local Laravel runtime is incomplete. Missing files: ${integrityIssuesAfterCopy.join(', ')}`
        );
    }

    await synchronizeRuntimeEnv(runtimeRoot);

    return runtimeRoot;
}

async function runPhpCommand(args, workingDirectory) {
    const phpBinary = phpBinaryPath();
    const phpIni = phpConfigurationPath();
    const fullArgs = [];

    if (phpIni) {
        fullArgs.push('-c', phpIni);
    }

    fullArgs.push(...args);

    await new Promise((resolve, reject) => {
        const child = spawn(phpBinary, fullArgs, {
            cwd: workingDirectory,
            env: {
                ...process.env,
                APP_URL: `http://127.0.0.1:${appPort}`,
            },
            windowsHide: true,
            stdio: 'pipe',
        });

        let output = '';

        child.stdout.on('data', (chunk) => {
            output += String(chunk);
        });

        child.stderr.on('data', (chunk) => {
            output += String(chunk);
        });

        child.once('error', reject);
        child.once('exit', (code) => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(new Error(
                `PHP command failed (${fullArgs.join(' ')}), exit code ${code ?? 'null'}.\n${output.trim()}`
            ));
        });
    });
}

async function migrateRuntimeDatabase(runtimeRoot) {
    await runPhpCommand(['artisan', 'migrate', '--force'], runtimeRoot);
}

function phpBinaryPath() {
    if (!app.isPackaged) {
        return process.env.ELECTRON_PHP_BINARY || 'php';
    }

    return path.join(process.resourcesPath, 'php', 'windows', 'php.exe');
}

function phpConfigurationPath() {
    if (!app.isPackaged) {
        return null;
    }

    return path.join(process.resourcesPath, 'php', 'windows', 'php.ini');
}

async function waitForServer(url, timeoutMs = 30000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        try {
            const response = await fetch(url, {
                cache: 'no-store',
            });

            if (response.ok) {
                return;
            }
        } catch {
            // The server is still starting.
        }

        await new Promise((resolve) => {
            setTimeout(resolve, 500);
        });
    }

    throw new Error(`The local server did not start within ${Math.round(timeoutMs / 1000)} seconds.`);
}

async function startPhpServer() {
    const runtimeRoot = await ensureRuntimeWorkspace();
    await migrateRuntimeDatabase(runtimeRoot);
    const publicRoot = path.join(runtimeRoot, 'public');
    const phpBinary = phpBinaryPath();
    const phpIni = phpConfigurationPath();
    const routerScript = path.join(
        runtimeRoot,
        'vendor',
        'laravel',
        'framework',
        'src',
        'Illuminate',
        'Foundation',
        'resources',
        'server.php'
    );

    if (!existsSync(phpBinary)) {
        throw new Error(`Bundled PHP runtime not found: ${phpBinary}`);
    }

    if (!existsSync(routerScript)) {
        throw new Error(`Laravel server router not found: ${routerScript}`);
    }

    if (!existsSync(path.join(publicRoot, 'index.php'))) {
        throw new Error(`Laravel public index was not found: ${path.join(publicRoot, 'index.php')}`);
    }

    if (!app.isPackaged && phpServerProcess) {
        return;
    }

    const args = [];

    if (phpIni) {
        args.push('-c', phpIni);
    }

    args.push(
        '-S',
        `127.0.0.1:${appPort}`,
        '-t',
        '.',
        routerScript,
    );

    phpServerOutput = [];

    phpServerProcess = spawn(phpBinary, args, {
        cwd: publicRoot,
        env: {
            ...process.env,
            APP_URL: `http://127.0.0.1:${appPort}`,
        },
        windowsHide: true,
        stdio: 'pipe',
    });

    phpServerProcess.stdout.on('data', (chunk) => {
        phpServerOutput.push(String(chunk));
        phpServerOutput = phpServerOutput.slice(-20);
        process.stdout.write(`[php] ${chunk}`);
    });

    phpServerProcess.stderr.on('data', (chunk) => {
        phpServerOutput.push(String(chunk));
        phpServerOutput = phpServerOutput.slice(-20);
        process.stderr.write(`[php] ${chunk}`);
    });

    phpServerProcess.once('exit', (code, signal) => {
        phpServerProcess = null;

        if (!app.isQuitting) {
            dialog.showErrorBox(
                'Local Server Stopped',
                `The bundled Laravel server stopped unexpectedly (code: ${code ?? 'null'}, signal: ${signal ?? 'null'}).\n\n${phpServerOutput.join('').trim()}`
            );
        }
    });

    await waitForServer(`http://127.0.0.1:${appPort}/login`);
}

async function createMainWindow() {
    await startPhpServer();

    mainWindow = new BrowserWindow({
        width: 1440,
        height: 960,
        minWidth: 1100,
        minHeight: 760,
        backgroundColor: '#f8fafc',
        title: 'Nexa Attendance Monitor',
        icon: appIconPath(),
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });

    await mainWindow.loadURL(`http://127.0.0.1:${appPort}/`);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

async function shutdownRuntime() {
    if (!phpServerProcess) {
        return;
    }

    const activeProcess = phpServerProcess;
    phpServerProcess = null;

    if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(activeProcess.pid), '/T', '/F'], {
            windowsHide: true,
            stdio: 'ignore',
        });

        return;
    }

    activeProcess.kill('SIGTERM');
}

app.on('window-all-closed', async () => {
    if (process.platform !== 'darwin') {
        app.isQuitting = true;
        await shutdownRuntime();
        app.quit();
    }
});

app.on('before-quit', async () => {
    app.isQuitting = true;
    await shutdownRuntime();
});

app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        await createMainWindow();
    }
});

app.whenReady()
    .then(createMainWindow)
    .catch(async (error) => {
        await dialog.showMessageBox({
            type: 'error',
            title: 'Unable to Start Nexa Attendance Monitor',
            message: error instanceof Error ? error.message : 'An unexpected startup error occurred.',
        });

        app.quit();
    });
