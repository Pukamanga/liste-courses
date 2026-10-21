import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// BASE_PATH est fourni par la GitHub Action (ex. /liste-courses/) pour GitHub Pages.
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [preact()],
  test: { include: ['tests/**/*.test.js'] },
});
