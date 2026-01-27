import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [preact()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.tsx'),
      name: 'Appmorph',
      fileName: 'appmorph',
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      // Bundle everything - don't externalize anything
      external: [],
      output: {
        globals: {},
        // Ensure exports work correctly
        exports: 'named',
      },
    },
    sourcemap: true,
    minify: 'esbuild',
  },
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
    },
  },
});
