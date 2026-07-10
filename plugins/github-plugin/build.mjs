import { build } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf-8'));

const outDir = path.join(__dirname, 'dist');
fs.mkdirSync(outDir, { recursive: true });

// Build each entry point
const entries = [
  { key: 'compact', file: 'src/compact.tsx' },
  { key: 'expanded', file: 'src/expanded.tsx' },
  { key: 'settings', file: 'src/settings.tsx' },
  { key: 'index', file: 'src/index.ts' },
];

for (const { key, file } of entries) {
  const entryPath = path.join(__dirname, file);
  if (!fs.existsSync(entryPath)) continue;

  await build({
    build: {
      lib: {
        entry: entryPath,
        formats: ['es'],
        fileName: () => `${key}.js`,
      },
      outDir,
      emptyOutDir: false,
      minify: false,
    },
    resolve: {
      alias: [
        { find: 'react/jsx-runtime', replacement: path.join(__dirname, 'src/shims/react-jsx-runtime.ts') },
        { find: 'react/jsx-dev-runtime', replacement: path.join(__dirname, 'src/shims/react-jsx-runtime.ts') },
        { find: 'react', replacement: path.join(__dirname, 'src/shims/react.ts') },
        { find: '@aeronotch/plugin-sdk', replacement: path.join(__dirname, 'src/shims/sdk.ts') },
      ],
    },
    esbuild: {
      jsx: 'automatic',
      jsxImportSource: 'react',
    },
  });

  console.log(`  Built: ${key}.js`);
}

// Copy manifest to dist
fs.copyFileSync(path.join(__dirname, 'manifest.json'), path.join(outDir, 'manifest.json'));
console.log('Build complete!');
