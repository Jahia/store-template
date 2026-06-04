import jahia from "@jahia/vite-plugin";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: { "~": path.resolve("./src") },
  },
  plugins: [jahia()],
});
