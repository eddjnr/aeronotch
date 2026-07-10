import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Helper to run shell commands
function runCmd(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', cwd: rootDir }).trim();
  } catch (e) {
    console.error(`Failed to run command: ${cmd}`, e);
    return '';
  }
}

async function main() {
  console.log('Starting automated plugin release detection...');

  // 1. Get changed files in the last commit/push
  let diffFiles = runCmd('git diff --name-only HEAD~1');
  if (!diffFiles) {
    console.log('No changed files detected.');
    return;
  }

  const changedFiles = diffFiles.split('\n');
  const changedPlugins = new Set();

  for (const file of changedFiles) {
    if (file.startsWith('plugins/') && file !== 'plugins/registry.json') {
      const parts = file.split('/');
      if (parts.length > 2) {
        changedPlugins.add(parts[1]); // e.g. "github-plugin"
      }
    }
  }

  if (changedPlugins.size === 0) {
    console.log('No changes detected in plugin source folders.');
    return;
  }

  console.log(`Detected changes in plugins: ${Array.from(changedPlugins).join(', ')}`);

  // Load registry.json
  const registryPath = path.join(rootDir, 'plugins', 'registry.json');
  let registry = { plugins: [] };
  if (fs.existsSync(registryPath)) {
    registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  }

  let registryChanged = false;
  let manifestsChanged = false;

  for (const pluginId of changedPlugins) {
    const pluginDir = path.join(rootDir, 'plugins', pluginId);
    const manifestPath = path.join(pluginDir, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      console.warn(`Manifest not found for plugin "${pluginId}" at ${manifestPath}. Skipping.`);
      continue;
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const currentVersion = manifest.version || '1.0.0';

    // Check if this is a new plugin or an update
    const isNew = !registry.plugins.some(p => p.id === pluginId);

    // Determine SemVer bump type by checking commits touching this plugin
    let bumpType = 'patch'; // default bump type
    const commits = runCmd(`git log --format=%s HEAD~1..HEAD -- plugins/${pluginId}`).split('\n');
    
    for (const commit of commits) {
      if (commit.includes('BREAKING CHANGE:') || commit.includes('!:')) {
        bumpType = 'major';
        break;
      } else if (commit.startsWith('feat:') || commit.startsWith('feat(')) {
        bumpType = 'minor';
      }
    }

    let nextVersion = currentVersion;
    if (!isNew) {
      const parts = currentVersion.split('.').map(Number);
      if (parts.length === 3) {
        if (bumpType === 'major') {
          parts[0] += 1;
          parts[1] = 0;
          parts[2] = 0;
        } else if (bumpType === 'minor') {
          parts[1] += 1;
          parts[2] = 0;
        } else {
          parts[2] += 1;
        }
        nextVersion = parts.join('.');
      } else {
        nextVersion = '1.0.1';
      }
      
      console.log(`Bumping plugin "${pluginId}" (${bumpType}): ${currentVersion} -> ${nextVersion}`);
      manifest.version = nextVersion;
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
      manifestsChanged = true;
    } else {
      console.log(`New plugin detected: "${pluginId}" with initial version: ${currentVersion}`);
    }

    // Ensure it's registered in registry.json
    if (isNew) {
      registry.plugins.push({
        id: pluginId,
        name: manifest.name,
        author: manifest.author || 'eddjnr',
        description: manifest.description || '',
        icon: manifest.icon || '',
        manifestUrl: `https://eddjnr.github.io/aeronotch/plugins/${pluginId}/manifest.json`
      });
      registryChanged = true;
    } else {
      // Sync metadata in registry
      const regIndex = registry.plugins.findIndex(p => p.id === pluginId);
      if (regIndex !== -1) {
        const item = registry.plugins[regIndex];
        if (item.name !== manifest.name || item.description !== manifest.description || item.icon !== manifest.icon) {
          item.name = manifest.name;
          item.description = manifest.description || '';
          item.icon = manifest.icon || '';
          registryChanged = true;
        }
      }
    }
  }

  if (registryChanged) {
    console.log('Updating registry.json...');
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  }

  // 2. Commit back changes to manifest.json and registry.json if there are any
  if (manifestsChanged || registryChanged) {
    runCmd('git config --global user.name "github-actions[bot]"');
    runCmd('git config --global user.email "41898282+github-actions[bot]@users.noreply.github.com"');
    
    runCmd('git add plugins/*/manifest.json plugins/registry.json');
    runCmd('git commit -m "chore(plugins): auto-bump plugin versions and update registry [skip ci]"');
    runCmd('git push origin HEAD:main');
    console.log('Successfully pushed manifest/registry updates back to main.');
  } else {
    console.log('No metadata or version changes to commit.');
  }
}

main().catch(console.error);
