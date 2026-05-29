import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
    dedupe: ["react", "react-dom"],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
    target: "es2019",
    cssCodeSplit: true,
    reportCompressedSize: false,
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          // Online-only systems are split into their own chunks so the
          // offline-mode startup path never downloads them. They are loaded
          // lazily via dynamic import() only when Online Mode is selected.
          firebase: ["firebase/app", "firebase/auth", "firebase/database"],
          ui: ["framer-motion", "lucide-react"],
          agora: ["agora-rtc-sdk-ng"],
          photon: ["photon-realtime"],
        },
      },
    },
  },
  server: { host: true },
});
