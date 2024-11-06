import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  base: "/static/assets/",
  build: {
    manifest: true,
    ssr: "src/server.tsx",
    outDir: resolve(__dirname, "static/assets"),
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/main.tsx'),
        server: resolve(__dirname, 'src/server.tsx'),
      }
    }
  },
  server: {
    port: Number(process.env.FRONTEND_PORT),
    origin: process.env.VITE_SERVER_URL,
  },
  preview: {
    port: Number(process.env.FRONTEND_PORT),
  },
})
