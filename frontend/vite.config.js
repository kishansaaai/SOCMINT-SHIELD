import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei'],
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
