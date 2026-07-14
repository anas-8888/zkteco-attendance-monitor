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

function installerMetadataRoot() {
    return path.join(app.getPath('appData'), 'nexa-attendance-monitor');
}

function initializedFlagPath() {
    return path.join(installerMetadataRoot(), 'initialized.flag');
}

function isInitializationMode() {
    return process.argv.includes('--initialize');
}

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
    envContents = setEnvValue(envContents, 'APP_ALLOW_BROWSER_SETUP', 'false');
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

async function runPhpCommandDetailed(args, workingDirectory, extraEnv = {}) {
    const phpBinary = phpBinaryPath();
    const phpIni = phpConfigurationPath();
    const fullArgs = [];

    if (phpIni) {
        fullArgs.push('-c', phpIni);
    }

    fullArgs.push(...args);

    return await new Promise((resolve, reject) => {
        const child = spawn(phpBinary, fullArgs, {
            cwd: workingDirectory,
            env: {
                ...process.env,
                ...extraEnv,
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
            resolve({
                code: code ?? 1,
                fullArgs,
                output: output.trim(),
            });
        });
    });
}

async function runPhpCommand(args, workingDirectory, extraEnv = {}) {
    const result = await runPhpCommandDetailed(args, workingDirectory, extraEnv);

    if (result.code === 0) {
        return result.output;
    }

    throw new Error(
        `PHP command failed (${result.fullArgs.join(' ')}), exit code ${result.code}.\n${result.output}`
    );
}

async function migrateRuntimeDatabase(runtimeRoot) {
    await runPhpCommand(['artisan', 'migrate', '--force'], runtimeRoot);
}

function parseJsonCommandOutput(output) {
    const trimmed = String(output ?? '').trim();

    if (trimmed === '') {
        throw new Error('The Laravel command did not return any output.');
    }

    const jsonLine = trimmed
        .split(/\r?\n/)
        .filter((line) => line.trim() !== '')
        .at(-1);

    return JSON.parse(jsonLine ?? trimmed);
}

function sanitizeIniValue(value) {
    return String(value ?? '')
        .replace(/[\r\n]+/g, ' ')
        .replaceAll('[', '(')
        .replaceAll(']', ')')
        .trim();
}

async function writeInitializationStatusFile(success, message) {
    const statusFilePath = process.env.NEXA_INSTALLER_STATUS_FILE;

    if (!statusFilePath) {
        return;
    }

    const contents = [
        '[Initialization]',
        `success=${success ? '1' : '0'}`,
        `message=${sanitizeIniValue(message)}`,
        '',
    ].join('\r\n');

    await writeFile(statusFilePath, contents, 'utf8');
}

async function writeInitializedFlag() {
    await mkdir(installerMetadataRoot(), { recursive: true });
    await writeFile(initializedFlagPath(), 'initialized=1\r\n', 'utf8');
}

async function initializationStatus(runtimeRoot) {
    const output = await runPhpCommand(
        ['artisan', 'app:initialization-status', '--json'],
        runtimeRoot,
    );

    return parseJsonCommandOutput(output);
}

async function initializeApplication(runtimeRoot) {
    // The installer passes credentials through one-time environment variables so
    // Laravel receives the raw password without us writing it to disk first.
    const result = await runPhpCommandDetailed(
        ['artisan', 'app:initialize', '--json'],
        runtimeRoot,
        {
            NEXA_INSTALLER_USERNAME: process.env.NEXA_INSTALLER_USERNAME ?? '',
            NEXA_INSTALLER_PASSWORD: process.env.NEXA_INSTALLER_PASSWORD ?? '',
            NEXA_INSTALLER_PASSWORD_CONFIRMATION: process.env.NEXA_INSTALLER_PASSWORD_CONFIRMATION ?? '',
        },
    );

    let parsedResult;

    try {
        parsedResult = parseJsonCommandOutput(result.output);
    } catch {
        parsedResult = {
            success: false,
            message: result.output || 'The Laravel initialization command did not return a valid response.',
        };
    }

    await writeInitializationStatusFile(
        result.code === 0 && parsedResult.success === true,
        parsedResult.message ?? 'The application could not be initialized.',
    );

    if (result.code !== 0 || parsedResult.success !== true) {
        throw new Error(parsedResult.message ?? 'The application could not be initialized.');
    }

    await writeInitializedFlag();
}

async function startupPath(runtimeRoot) {
    const status = await initializationStatus(runtimeRoot);

    if (status.initialized) {
        await writeInitializedFlag();
        return '/login';
    }

    if (status.allow_browser_setup) {
        return '/setup';
    }

    throw new Error(
        typeof status.message === 'string' && status.message !== ''
            ? status.message
            : 'Installation did not complete correctly. Run the installer again.'
    );
}

async function runInitializationMode() {
    const runtimeRoot = await ensureRuntimeWorkspace();

    try {
        await migrateRuntimeDatabase(runtimeRoot);
        await initializeApplication(runtimeRoot);
        app.exit(0);
    } catch (error) {
        const message = error instanceof Error
            ? error.message
            : 'An unexpected initialization error occurred.';

        await writeInitializationStatusFile(false, message);
        app.exit(1);
    }
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
    const initialPath = await startupPath(runtimeRoot);
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
        return initialPath;
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

    await waitForServer(`http://127.0.0.1:${appPort}${initialPath}`);

    return initialPath;
}

async function createMainWindow() {
    const initialPath = await startPhpServer();

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

    await mainWindow.loadURL(`http://127.0.0.1:${appPort}${initialPath}`);

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
    .then(async () => {
        if (isInitializationMode()) {
            await runInitializationMode();
            return;
        }

        await createMainWindow();
    })
    .catch(async (error) => {
        if (isInitializationMode()) {
            await writeInitializationStatusFile(
                false,
                error instanceof Error ? error.message : 'An unexpected initialization error occurred.',
            );
            app.exit(1);
            return;
        }

        await dialog.showMessageBox({
            type: 'error',
            title: 'Unable to Start Nexa Attendance Monitor',
            message: error instanceof Error ? error.message : 'An unexpected startup error occurred.',
        });

        app.quit();
    });
