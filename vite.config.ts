
import { defineConfig } from "vite";

export default defineConfig({
  publicDir: "public",

  build: {
    outDir: "dist",
    emptyOutDir: true,

    rollupOptions: {
      input: "src/content/index.ts",

      output: {
        entryFileNames: "content.js",
        format: "iife",
      },
    },
  },
});
