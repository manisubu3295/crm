import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    proxy: {
      "/api": "http://localhost:3000",
      // CRM app routes — proxy to the CRM Vite dev server so "Staff Login" works
      // when the website is accessed directly on port 5174.
      "/login":      { target: "http://localhost:5173", changeOrigin: true },
      "/leads":      { target: "http://localhost:5173", changeOrigin: true },
      "/students":   { target: "http://localhost:5173", changeOrigin: true },
      "/enquiries":  { target: "http://localhost:5173", changeOrigin: true },
      "/followups":  { target: "http://localhost:5173", changeOrigin: true },
      "/dashboard":  { target: "http://localhost:5173", changeOrigin: true },
      "/settings":   { target: "http://localhost:5173", changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
