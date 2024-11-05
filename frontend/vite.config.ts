import { defineConfig } from 'vite'
import { resolve } from 'path';
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  base: "/static/",
  build: {
    manifest: "manifest.json",
    outDir: resolve("./assets"),
    rollupOptions: {
      input: {
        main: resolve("./src/main.tsx"),
      }
    }
  },
  server: {
    port: process.env.FRONTEND_PORT,
  },
  preview: {
    port: process.env.FRONTEND_PORT,
  },
})
