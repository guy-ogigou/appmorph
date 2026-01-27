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
      // Don't externalize preact - bundle it for UMD
      external: [],
      output: {
        // Provide global variables for UMD build
        globals: {},
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
