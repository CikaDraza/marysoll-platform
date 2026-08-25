import { defineConfig } from "vitest/config";
import path from "path";

/**
 * VITEST = JEDINI root test runner (`npm test`).
 *
 * Pokriva sve u src/: 51 legacy util test (contactRules, loyalty, cityMatch…)
 * preko `globals`, i proxy safety-net (src/proxy.test.ts — Next middleware:
 * domain detection, tenant routing, rewrite, auth granice, canonical 301,
 * client routing, debug trace preko NextRequest/NextResponse). Workspace paketi
 * imaju svaki svoj vitest (`npm run test:engines`).
 *
 * Jest je uklonjen (2026-07-07): nijedan test ne zahteva jest — vitest sa
 * `globals` pokriva i legacy jest-stil (describe/it), pa je jest bio suvišan.
 */
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
      // Vidi test/server-only-stub.ts — marker ostaje u build-u, testovi ga
      // razrešavaju na no-op.
      "server-only": path.resolve(__dirname, "test/server-only-stub.ts"),
    },
  },
});
