import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['monaco-editor'],
    esbuildOptions: {
      target: 'es2020',
    }
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ['monaco-editor', '@monaco-editor/react']
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  esbuild: {
    target: 'es2020'
  },
  // Proxy for LM Studio to avoid CORS issues
  server: {
    host: '0.0.0.0',
    port: 5173,
    hmr: {
      // Use polling for file watching on Linux systems
      usePolling: true,
      interval: 1000,
      port: 5174
    },
    watch: {
      usePolling: true,
      interval: 1000
    },
    proxy: {
      '/v1': {
        target: 'http://127.0.0.1:1234',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/v1/, '/v1'),
      },
      // Proxy for Ollama (default)
      '/ollama': {
        target: 'http://127.0.0.1:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, ''),
      },
    },
  },
})