import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    // Postojeći testovi (contactRules, loyalty, cityMatch...) pisani su za
    // jest globale (describe/it bez importa) — globals ih pokriva.
    globals: true,
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
