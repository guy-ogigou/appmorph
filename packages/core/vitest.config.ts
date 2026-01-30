import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use the globals API (describe, it, expect, etc.)
    globals: true,

    // Test environment
    environment: 'node',

    // Test file patterns
    include: ['test/**/*.test.ts'],

    // Timeout for async tests (e2e tests may take longer)
    testTimeout: 30000,

    // Hook timeout
    hookTimeout: 30000,

    // Ensure tests run sequentially (important for e2e tests)
    sequence: {
      shuffle: false,
    },

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/index.ts'],
    },
  },
});
