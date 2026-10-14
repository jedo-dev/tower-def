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
    setupFiles: ['./src/shared/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
