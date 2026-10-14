import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const API_TARGET = process.env.CC_REMOTE_API_TARGET || "http://127.0.0.1:61777";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: Number(process.env.CC_REMOTE_APP_PORT) || 61888,
    allowedHosts: [".ts.net", ".local", "localhost"],
    proxy: {
      "/api": { target: API_TARGET, changeOrigin: true, ws: false },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: Number(process.env.CC_REMOTE_PREVIEW_PORT) || 61889,
    allowedHosts: [".ts.net", ".local", "localhost"],
    proxy: {
      "/api": { target: API_TARGET, changeOrigin: true, ws: false },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
