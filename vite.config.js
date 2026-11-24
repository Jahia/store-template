import jahia from "@jahia/vite-plugin";
import path from "node:path";
import sbom from "rollup-plugin-sbom";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: { "~": path.resolve("./src") },
  },
  plugins: [sbom({ specVersion: "1.4" }), jahia()],
});
