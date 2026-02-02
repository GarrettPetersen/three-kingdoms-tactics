import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Crucial for Electron to find assets using relative paths
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});


