module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/**/*.spec.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  coverageDirectory: './coverage',
  coveragePathIgnorePatterns: ['node_modules', 'src/test'],
  coverageReporters: ["json-summary",
  "text",
  "lcov"],
  reporters: ['default'],
  globals: { 'ts-jest': { diagnostics: false } },
  transform: {},
};
