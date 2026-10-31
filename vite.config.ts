import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { fileURLToPath } from 'node:url';
import pkg from './package.json' with { type: 'json' };

const dir = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  // Относительный путь: одна сборка работает и в /skat2/, и в /skat2/beta/, и в APK/EXE.
  base: './',
  plugins: [preact()],
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
  build: { target: 'es2022', sourcemap: true },
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
