// const { createDefaultPreset } = require("ts-jest");

// const tsJestTransformCfg = createDefaultPreset().transform;

// /** @type {import("jest").Config} **/
// module.exports = {
//   testEnvironment: "node",
//   transform: {
//     ...tsJestTransformCfg,
//   },
// };

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  // Directorios donde Jest buscará las pruebas
  testMatch: ["**/__tests__/**/*.test.ts"],
  // Habilitar la recolección de cobertura por defecto
  collectCoverage: true,
  coverageDirectory: "coverage",
  // Evitar que mida cobertura en carpetas de configuración o tests
  coveragePathIgnorePatterns: ["/node_modules/", "/__tests__/"],
  // Configuración estricta del 80%
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
