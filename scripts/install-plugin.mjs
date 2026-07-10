import fs from 'fs';
import path from 'path';
import os from 'os';

const pluginDir = process.argv[2];
if (!pluginDir) {
  console.error('Usage: node scripts/install-plugin.mjs <plugin-dist-dir>');
  process.exit(1);
}

const resolvedDir = path.resolve(pluginDir);
const manifestPath = path.join(resolvedDir, 'manifest.json');

if (!fs.existsSync(manifestPath)) {
  console.error(`No manifest.json found in ${resolvedDir}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
const outDir = path.join(
  os.homedir(),
  'AppData',
  'Roaming',
  'com.user.aeronotch',
  'plugins',
  manifest.id
);

fs.mkdirSync(outDir, { recursive: true });
fs.cpSync(resolvedDir, outDir, { recursive: true });
console.log(`Plugin "${manifest.name}" v${manifest.version} installed to ${outDir}`);
