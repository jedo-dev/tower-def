import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
})
