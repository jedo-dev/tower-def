import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          // The engine gets its own long-cached chunk. Only the lazily loaded
          // game page imports it, so the menus never download it.
          groups: [{ name: 'phaser', test: /[\\/]node_modules[\\/]phaser[\\/]/ }],
        },
      },
    },
  },
  test: {
    globals: true,
    // Domain logic runs in node; component tests opt into jsdom via the
    // `@vitest-environment jsdom` docblock in each .test.tsx file.
    environment: 'node',
    // Vitest stubs every CSS import; let a `?raw` import of a stylesheet
    // through so layout tests can inject the real rules into jsdom
    // (see `shared/test/injectCssModule`).
    css: { include: [/\.css\?raw$/] },
    setupFiles: ['./src/shared/test/setup.ts'],
    // Scene-harness suites preload the real game scene and content; under a
    // full parallel run that can exceed the 5s/10s defaults without any hang.
    testTimeout: 20_000,
    hookTimeout: 60_000,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
