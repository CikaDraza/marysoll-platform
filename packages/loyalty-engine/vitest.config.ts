import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Čista domenska logika (pricing/codes/currency) — bez DOM-a.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
