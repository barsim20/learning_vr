import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [basicSsl()],
  server: {
    https: true,
    host: true, // expose on LAN so Quest 3 can connect
    port: 5173,
  },
  build: {
    outDir: 'dist',
  },
});
