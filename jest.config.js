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
};

module.exports = config;
