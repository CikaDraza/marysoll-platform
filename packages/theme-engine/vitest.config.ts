import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Engine je čist TypeScript bez DOM-a — node okruženje je dovoljno.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
