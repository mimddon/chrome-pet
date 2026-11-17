import { defineConfig } from "vite";

export default defineConfig({
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: false,
    rollupOptions: {
      input: "src/background/index.ts",
      output: { entryFileNames: "background.js", format: "iife" },
    },
  },
});
