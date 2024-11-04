import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  server: {
    port: process.env.FRONTEND_PORT,
  },
  preview: {
    port: process.env.FRONTEND_PORT,
  },
})
