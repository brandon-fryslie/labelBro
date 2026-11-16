import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// The first port find_available_port tries in label_bro/app.py.
const FLASK_ORIGIN = 'http://127.0.0.1:5099';

// Every route label_bro/app.py serves besides `/` (a prefix also covers its sub-paths, e.g. /printers/discover).
const FLASK_ROUTES = ['/printers', '/printLabels', '/previewLabels', '/log-frontend-error'];

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Flask serves the build under /static/dist/ (FRONTEND_INDEX in label_bro/app.py); the dev server serves from its root.
  base: command === 'build' ? '/static/dist/' : '/',
  build: {
    outDir: 'label_bro/static/dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    proxy: Object.fromEntries(FLASK_ROUTES.map((route) => [route, FLASK_ORIGIN])),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
  },
}));
