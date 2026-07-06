import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const pkgPath = path.join(rootDir, 'package.json');
const tauriConfPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json');
const cargoPath = path.join(rootDir, 'src-tauri', 'Cargo.toml');
const settingsSidebarPath = path.join(rootDir, 'src', 'components', 'settings', 'SettingsSidebar.tsx');
const translationsPath = path.join(rootDir, 'src', 'i18n', 'translations.ts');

if (!fs.existsSync(pkgPath)) {
  console.error(`package.json not found at ${pkgPath}`);
  process.exit(1);
}

// Read package.json
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const oldVersion = pkg.version;
const parts = oldVersion.split('.');

if (parts.length !== 3) {
  console.error(`Invalid version format in package.json: ${oldVersion}`);
  process.exit(1);
}

const newVersion = process.argv[2] || (() => {
  parts[2] = String(parseInt(parts[2], 10) + 1);
  return parts.join('.');
})();

function replaceInFile(filePath, searchValue, replaceValue) {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}, skipping.`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes(searchValue)) {
    console.warn(`Pattern "${searchValue}" not found in ${filePath}, skipping.`);
    return;
  }
  content = content.replaceAll(searchValue, replaceValue);
  fs.writeFileSync(filePath, content, 'utf8');
  console.error(`Updated ${filePath}`);
}

// Update package.json
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.error(`Updated ${pkgPath}`);

// Update tauri.conf.json
if (fs.existsSync(tauriConfPath)) {
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
  tauriConf.version = newVersion;
  fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n', 'utf8');
  console.error(`Updated ${tauriConfPath}`);
}

// Update Cargo.toml
replaceInFile(cargoPath, `version = "${oldVersion}"`, `version = "${newVersion}"`);

// Update SettingsSidebar.tsx
replaceInFile(settingsSidebarPath, `AeroNotch v${oldVersion}`, `AeroNotch v${newVersion}`);

// Update translations.ts (both languages)
replaceInFile(translationsPath, `Version ${oldVersion}`, `Version ${newVersion}`);
replaceInFile(translationsPath, `Versão ${oldVersion}`, `Versão ${newVersion}`);

// Regenerate Cargo.lock with the new version
try {
  execSync('cargo generate-lockfile', { cwd: path.join(rootDir, 'src-tauri'), stdio: 'pipe' });
  console.error('Regenerated Cargo.lock');
} catch (err) {
  console.warn(`Failed to regenerate Cargo.lock: ${err.message}`);
}

console.log(newVersion);
