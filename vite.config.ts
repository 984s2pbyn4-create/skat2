import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import preact from '@preact/preset-vite';
import { fileURLToPath } from 'node:url';
import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import pkg from './package.json' with { type: 'json' };
import { swSource } from './src/platform/sw/template.ts';

const dir = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

/** Генерирует sw.js со списком всех файлов сборки — приложение работает без сети. */
function serviceWorker(version: string): Plugin {
  return {
    name: 'skat2-sw',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = new Set(['./', './index.html']);
      for (const f of readdirSync(dir('./public'), { recursive: true, withFileTypes: true })) {
        if (f.isFile())
          files.add(`./${relative(dir('./public'), join(f.parentPath, f.name)).split(sep).join('/')}`);
      }
      for (const f of Object.keys(bundle)) if (!f.endsWith('.map') && f !== 'sw.js') files.add(`./${f}`);
      const list = [...files].sort();
      let h = 0;
      for (const ch of list.join('|')) h = (h * 31 + ch.charCodeAt(0)) | 0;
      const source = swSource(`${version}-${(h >>> 0).toString(36)}`, list);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  // Относительный путь: одна сборка работает и в /skat2/, и в /skat2/beta/, и в APK/EXE.
  base: './',
  plugins: [preact(), serviceWorker(pkg.version)],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: {
    alias: {
      '@core': dir('./src/core'),
      '@platform': dir('./src/platform'),
      '@kit': dir('./src/kit'),
      '@modes': dir('./src/modes'),
      '@app': dir('./src/app'),
    },
  },
  build: { target: 'es2022', sourcemap: true, chunkSizeWarningLimit: 1200 },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/core/**/*.ts'],
      exclude: ['src/core/**/*.test.ts'],
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
    },
  },
});
