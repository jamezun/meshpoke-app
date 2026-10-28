import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5180, strictPort: true, proxy: { '/v1': { target: process.env.E2E_API_ORIGIN ?? 'http://localhost:3000' } } },
});
