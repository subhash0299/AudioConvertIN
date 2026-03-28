import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Required for @ffmpeg/core-mt (SharedArrayBuffer / pthread pool). */
const crossOriginIsolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  /** Helps same-origin script/wasm loads satisfy COEP in some browsers (workers). */
  'Cross-Origin-Resource-Policy': 'same-origin',
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: crossOriginIsolationHeaders,
  },
  preview: {
    headers: crossOriginIsolationHeaders,
  },
  optimizeDeps: {
    // FFmpeg registers a module worker; pre-bundling breaks worker resolution (missing .vite/deps/worker.js).
    exclude: ['lucide-react', '@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
});
