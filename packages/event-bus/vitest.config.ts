import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Čist bus/kontrakti — bez DOM-a.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
