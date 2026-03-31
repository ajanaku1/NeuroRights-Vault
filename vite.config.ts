import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  optimizeDeps: {
    include: [
      'multiformats',
      'varint',
      '@lit-protocol/lit-node-client',
      '@lit-protocol/encryption',
      '@lit-protocol/constants',
      '@lit-protocol/auth-helpers',
    ],
  },
  build: {
    target: 'esnext',
  },
})
