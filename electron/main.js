import electron from 'electron';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const appPort = Number.parseInt(process.env.ELECTRON_APP_PORT ?? '9510', 10);
const runtimeVersionFile = '.nexa-runtime-version';
const { app, BrowserWindow, dialog } = electron;
let mainWindow = null;
let phpServerProcess = null;

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

async function ensureRuntimeWorkspace() {
    if (!app.isPackaged) {
        return repoRoot;
    }

    const sourceRoot = path.join(process.resourcesPath, 'laravel-app');
    const runtimeRoot = path.join(app.getPath('userData'), 'laravel-runtime');
    const versionMarkerPath = path.join(runtimeRoot, runtimeVersionFile);
    const currentVersion = app.getVersion();
    const existingVersion = existsSync(versionMarkerPath)
        ? (await readFile(versionMarkerPath, 'utf8')).trim()
        : '';

    if (!existsSync(runtimeRoot)) {
        await mkdir(runtimeRoot, { recursive: true });
    }

    if (!existsSync(path.join(runtimeRoot, 'artisan')) || existingVersion !== currentVersion) {
        await copyDirectoryPreservingUserData(sourceRoot, runtimeRoot);
        await copyIfMissing(path.join(sourceRoot, '.env'), path.join(runtimeRoot, '.env'));
        await copyIfMissing(path.join(sourceRoot, 'database', 'database.sqlite'), path.join(runtimeRoot, 'database', 'database.sqlite'));
        await mkdir(path.join(runtimeRoot, 'storage', 'app'), { recursive: true });
        await mkdir(path.join(runtimeRoot, 'storage', 'framework', 'cache'), { recursive: true });
        await mkdir(path.join(runtimeRoot, 'storage', 'framework', 'sessions'), { recursive: true });
        await mkdir(path.join(runtimeRoot, 'storage', 'framework', 'testing'), { recursive: true });
        await mkdir(path.join(runtimeRoot, 'storage', 'framework', 'views'), { recursive: true });
        await mkdir(path.join(runtimeRoot, 'storage', 'logs'), { recursive: true });
        await writeFile(versionMarkerPath, currentVersion, 'utf8');
    }

    return runtimeRoot;
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
    const phpBinary = phpBinaryPath();
    const phpIni = phpConfigurationPath();

    if (!existsSync(phpBinary)) {
        throw new Error(`Bundled PHP runtime not found: ${phpBinary}`);
    }

    if (!app.isPackaged && phpServerProcess) {
        return;
    }

    const args = [];

    if (phpIni) {
        args.push('-c', phpIni);
    }

    args.push(
        'artisan',
        'serve',
        '--host=127.0.0.1',
        `--port=${appPort}`,
    );

    phpServerProcess = spawn(phpBinary, args, {
        cwd: runtimeRoot,
        env: {
            ...process.env,
            APP_URL: `http://127.0.0.1:${appPort}`,
        },
        windowsHide: true,
        stdio: 'pipe',
    });

    phpServerProcess.stdout.on('data', (chunk) => {
        process.stdout.write(`[php] ${chunk}`);
    });

    phpServerProcess.stderr.on('data', (chunk) => {
        process.stderr.write(`[php] ${chunk}`);
    });

    phpServerProcess.once('exit', (code, signal) => {
        phpServerProcess = null;

        if (!app.isQuitting) {
            dialog.showErrorBox(
                'Local Server Stopped',
                `The bundled Laravel server stopped unexpectedly (code: ${code ?? 'null'}, signal: ${signal ?? 'null'}).`
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
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
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
