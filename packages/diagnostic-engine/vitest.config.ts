import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Collectori čitaju window/navigator/localStorage — happy-dom ih simulira.
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
  },
});
