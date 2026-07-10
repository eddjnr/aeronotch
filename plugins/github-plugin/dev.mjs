import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, 'src');

console.log('👀 Watching plugin files for changes...');

let debounceTimeout = null;

function rebuildAndInstall() {
  console.log('🔄 File change detected. Rebuilding and installing plugin...');
  
  // Run build
  const build = spawn('pnpm', ['plugins:build'], { shell: true, stdio: 'inherit', cwd: path.join(__dirname, '../..') });
  
  build.on('close', (code) => {
    if (code === 0) {
      // Run install
      const install = spawn('pnpm', ['plugins:install'], { shell: true, stdio: 'inherit', cwd: path.join(__dirname, '../..') });
      install.on('close', (installCode) => {
        if (installCode === 0) {
          console.log('\n✅ Plugin successfully updated! Press Ctrl+R in the AeroNotch settings window to reload changes.\n');
        }
      });
    }
  });
}

// Initial build and install
rebuildAndInstall();

fs.watch(srcDir, { recursive: true }, (eventType, filename) => {
  if (filename) {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(rebuildAndInstall, 200);
  }
});
