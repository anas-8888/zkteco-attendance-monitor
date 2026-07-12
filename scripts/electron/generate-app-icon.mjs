import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pngToIco from 'png-to-ico';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const sourceIcon = path.join(repoRoot, 'public', 'Logo Mark-ChOkOwGe.png');
const buildDir = path.join(repoRoot, 'build');
const destinationIcon = path.join(buildDir, 'icon.ico');

await mkdir(buildDir, { recursive: true });

const iconBuffer = await pngToIco(sourceIcon);

await writeFile(destinationIcon, iconBuffer);

console.log(`Prepared application icon at ${destinationIcon}`);
