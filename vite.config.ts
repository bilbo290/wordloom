import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['monaco-editor']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Uncomment if you encounter CORS issues with LM Studio
  // server: {
  //   proxy: {
  //     '/v1': {
  //       target: 'http://127.0.0.1:1234',
  //       changeOrigin: true,
  //     },
  //   },
  // },
})