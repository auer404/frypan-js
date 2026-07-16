// scripts/build.mts
import { build, type InlineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const entry = resolve(__dirname, '../src/main.ts');
const srcRoot = resolve(__dirname, '../src');

const version = "-1.0.1";

const base: InlineConfig = {
  build: {
    lib: {
      entry,
      name: 'frypan',
      formats: ['es'],
    },
  },
};

async function run() {
  // Standalone
  await build({
    ...base,
    build: {
      ...base.build,
      minify: false,
      outDir: 'dist',
      emptyOutDir: true,
      lib: { ...base.build!.lib, fileName: 'frypan'+version } as any,
    },
  });

  // Minified
  await build({
    ...base,
    build: {
      ...base.build,
      minify: 'terser',
      terserOptions: {
        compress: {
          passes: 3,
          //drop_console: true,
          pure_getters: true,
          //unsafe: true,         
        },
        mangle: {
          properties: false,
        },
        format: {
          comments: false,
        },
      },
      outDir: 'dist',
      emptyOutDir: false,
      lib: { ...base.build!.lib, fileName: 'frypan'+version+'.min' } as any,
    },
  });

  // 3. Verbose
  await build({
    ...base,
    build: {
      ...base.build,
      minify: false,
      outDir: 'dist/frypan'+version+'-dev',
      emptyOutDir: true,
      lib: { ...base.build!.lib, entry },
      rollupOptions: {
        output: {
          preserveModules: true,
          preserveModulesRoot: srcRoot,
          entryFileNames: '[name].js',
        },
      },
    },
  });

  // 4. Old-school <script> integration
  await build({
    ...base,
    build: {
      ...base.build,
      minify: false,
      outDir: 'dist',
      emptyOutDir: false,
      lib: {
        ...base.build!.lib,
        formats: ['iife'],
        fileName: () => 'frypan'+version+'.global.js',
        name: 'FryPan', // exposes window.FryPan
      } as any,
    },
  });
}

run();