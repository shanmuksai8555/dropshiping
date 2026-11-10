import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the repo under /dropshiping/. Every runtime asset path goes through
// import.meta.env.BASE_URL so changing this one value moves the whole site.
export default defineConfig({
  base: '/dropshiping/',
  plugins: [react()],
  build: { target: 'es2022' },
});
