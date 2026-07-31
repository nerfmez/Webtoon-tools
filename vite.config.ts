import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/Webtoon-tools/',
  plugins: [react()],
  build: {
    sourcemap: true,
  },
});
