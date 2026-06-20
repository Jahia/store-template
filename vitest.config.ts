import { defineConfig } from "vitest/config";

// Standalone test config (does not load the build's vite.config.js / @jahia/vite-plugin, which is
// SSR-build-specific). The units under test are pure helpers, so a plain Node environment is enough.
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
