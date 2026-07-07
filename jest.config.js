/**
 * Jest = PRIVREMENO zadržan runner (vitest je primaran — vidi vitest.config.ts).
 * Pokreće legacy util testove preko `npm run test:jest`. NE dira:
 *   - packages/*         → svaki paket ima svoj vitest
 *   - src/proxy.test.ts  → vitest-only (import iz "vitest": vi.stubEnv/resetModules)
 * Cilj: vitest-only kad ne bude razloga da jest ostane.
 */
/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { useESM: false }],
  },
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  testPathIgnorePatterns: [
    "/node_modules/",
    "<rootDir>/packages/",
    "<rootDir>/src/proxy.test.ts",
  ],
};

module.exports = config;
