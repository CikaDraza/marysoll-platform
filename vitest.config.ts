import { defineConfig } from "vitest/config";
import path from "path";

/**
 * TEST RUNNERI (privremeno dva; cilj: vitest-only).
 *
 * Vitest = PRIMARNI (`npm test`): sve u src/ — 51 legacy util test (contactRules,
 *   loyalty, cityMatch…) preko `globals`, i proxy compatibility suite
 *   (src/proxy.test.ts: Next middleware — rewrite/redirect/headers/cookies preko
 *   NextRequest/NextResponse). Workspace paketi imaju svaki svoj vitest
 *   (`npm run test:engines`).
 * Jest = zadržan PRIVREMENO (`npm run test:jest`, ts-jest) za legacy kompatibilnost;
 *   NE pokreće proxy.test.ts (vitest-only fajl) — vidi jest.config.js.
 *
 * Napomena: proxy.test.ts je VEĆ vitest i zeleno pod vitest-om, pa je „migracija
 *   proxy testova na vitest" zapravo već ispunjena. Kad proxy.ts oslabi na tanak
 *   orkestrator (logika u lib/proxy/pipeline · guards · platform), još više će
 *   biti čist unit test kroz vitest, a jest se može ukloniti bez gubitka.
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
    },
  },
});
