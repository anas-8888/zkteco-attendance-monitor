import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const outputRoot = path.join(repoRoot, '.electron', 'laravel-app');
const runtimeBuildIdFile = '.nexa-runtime-build-id';

const directoriesToCopy = [
    'app',
    'bootstrap',
    'config',
    'database',
    'public',
    'resources',
    'routes',
    'storage',
    'vendor',
];

const filesToCopy = [
    '.env',
    '.env.example',
    'artisan',
    'composer.json',
    'composer.lock',
];

async function main() {
    await rm(outputRoot, { recursive: true, force: true });
    await mkdir(outputRoot, { recursive: true });

    for (const directory of directoriesToCopy) {
        await cp(path.join(repoRoot, directory), path.join(outputRoot, directory), {
            recursive: true,
            force: true,
        });
    }

    for (const file of filesToCopy) {
        await cp(path.join(repoRoot, file), path.join(outputRoot, file), {
            force: true,
        });
    }

    const packageJson = JSON.parse(
        await readFile(path.join(repoRoot, 'package.json'), 'utf8')
    );
    const buildId = `${packageJson.version ?? '0.0.0'}|${new Date().toISOString()}`;

    await writeFile(path.join(outputRoot, runtimeBuildIdFile), buildId, 'utf8');

    console.log(`Prepared Laravel runtime at ${outputRoot}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
