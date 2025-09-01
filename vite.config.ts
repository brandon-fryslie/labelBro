import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: './src',
  build: {
    outDir: '../label_bro/static/js',
    rollupOptions: {
      input: {
        main: './src/main.tsx'
      },
      output: {
        entryFileNames: 'bundle.js',
        chunkFileNames: 'chunk-[name].js',
        assetFileNames: 'asset-[name][extname]'
      }
    }
  },
  server: {
    proxy: {
      // Proxy API calls to Flask backend
      '/printers': 'http://localhost:5000',
      '/preview': 'http://localhost:5000',
      '/print_labels': 'http://localhost:5000'
    }
  }
});