import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rcedit } from 'rcedit';

export default async function afterPack(context) {
    if (context.electronPlatformName !== 'win32') {
        return;
    }

    const productFilename = context.packager.appInfo.productFilename;
    const appExecutable = path.join(context.appOutDir, `${productFilename}.exe`);
    const scriptDir = path.dirname(fileURLToPath(import.meta.url));
    const repoRoot = path.resolve(scriptDir, '..', '..');
    const iconPath = path.join(repoRoot, 'build', 'icon.ico');

    await rcedit(appExecutable, {
        icon: iconPath,
    });
}
