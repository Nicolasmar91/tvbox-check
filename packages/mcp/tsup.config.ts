import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  clean: true,
  // Le moteur et les données sont embarqués ; le SDK MCP et zod restent des dépendances.
  noExternal: ["@tvbox-check/core"],
});
