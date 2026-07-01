import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Vitest configuration for Football Fever.
 *
 * The app uses the "@/..." path alias (see tsconfig.json -> compilerOptions.paths),
 * so we mirror it here as a resolve alias. Without this, imports like
 * `import { runOracle } from "@/lib/oracle/engine"` would not resolve under Vitest.
 *
 * Pure-logic modules (oracle / odds / scoring / normalize) have no DOM or
 * browser dependencies, so the default "node" environment is all we need.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
  },
});
