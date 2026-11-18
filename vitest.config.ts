import path from "node:path";
import { defineConfig } from "vitest/config";

// Standalone test config (does not load the build's vite.config.js / @jahia/vite-plugin, which is
// SSR-build-specific). The units under test are pure helpers and server-rendered components, so a
// plain Node environment is enough. The "~" alias mirrors vite.config.js so components resolve.
export default defineConfig({
  // tsconfig keeps "jsx": "preserve" for the Jahia build; tests transform JSX themselves.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: { "~": path.resolve("./src") },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
