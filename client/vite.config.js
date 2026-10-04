import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin()],
  server: {
    port: 3000,
	allowedHosts: [
      'c1c6-114-10-45-194.ngrok-free.app' // Tambahkan host ini
    ],
  },
  build: {
    target: 'esnext',
  },
});
