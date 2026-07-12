import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const outputRoot = path.join(repoRoot, '.electron', 'php', 'windows');

const excludedDirectories = new Set([
    'cfg',
    'CompatInfo',
    'data',
    'dev',
    'docs',
    'extras',
    'man',
    'pear',
    'scripts',
    'tests',
    'tmp',
    'windowsXamppPhp',
    'www',
]);

function detectPhpSourceDirectory() {
    if (process.env.ELECTRON_PHP_SOURCE) {
        return process.env.ELECTRON_PHP_SOURCE;
    }

    const phpPath = execSync('where php', {
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'ignore'],
    })
        .toString()
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean);

    if (!phpPath) {
        throw new Error('Unable to locate php.exe. Set ELECTRON_PHP_SOURCE to a PHP directory.');
    }

    return path.dirname(phpPath);
}

async function copyPhpRuntime(sourceRoot) {
    await rm(outputRoot, { recursive: true, force: true });
    await mkdir(outputRoot, { recursive: true });

    const entries = await (await import('node:fs/promises')).readdir(sourceRoot, {
        withFileTypes: true,
    });

    for (const entry of entries) {
        if (entry.isDirectory() && excludedDirectories.has(entry.name)) {
            continue;
        }

        await cp(
            path.join(sourceRoot, entry.name),
            path.join(outputRoot, entry.name),
            {
                recursive: true,
                force: true,
            }
        );
    }
}

async function writePortablePhpIni() {
    const phpIniContent = `date.timezone=UTC
memory_limit=512M
post_max_size=64M
upload_max_filesize=64M
max_execution_time=120
extension_dir="ext"
extension=bz2
extension=curl
extension=fileinfo
extension=gettext
extension=mbstring
extension=exif
extension=openssl
extension=pdo_sqlite
extension=sqlite3
extension=sockets
extension=zip
`;

    await writeFile(path.join(outputRoot, 'php.ini'), phpIniContent, 'utf8');
}

async function ensurePhpArtifacts() {
    const requiredFiles = [
        'php.exe',
        'php8ts.dll',
        path.join('ext', 'php_pdo_sqlite.dll'),
        path.join('ext', 'php_sqlite3.dll'),
        path.join('ext', 'php_sockets.dll'),
    ];

    for (const requiredFile of requiredFiles) {
        if (!existsSync(path.join(outputRoot, requiredFile))) {
            throw new Error(`Portable PHP runtime is missing required file: ${requiredFile}`);
        }
    }
}

async function main() {
    const sourceRoot = detectPhpSourceDirectory();

    if (!existsSync(path.join(sourceRoot, 'php.exe'))) {
        throw new Error(`The PHP source directory does not contain php.exe: ${sourceRoot}`);
    }

    await copyPhpRuntime(sourceRoot);
    await writePortablePhpIni();
    await ensurePhpArtifacts();

    const sourceIni = path.join(sourceRoot, 'php.ini');

    if (existsSync(sourceIni)) {
        const iniContents = await readFile(sourceIni, 'utf8');
        await writeFile(path.join(outputRoot, 'php.ini.source.backup'), iniContents, 'utf8');
    }

    console.log(`Prepared portable PHP runtime at ${outputRoot}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
