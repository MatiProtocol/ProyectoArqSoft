module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  roots: ['<rootDir>'],
  setupFiles: ['<rootDir>/tests/setup-env.ts'],
  testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/infrastructure/config/env.ts',
  ],
  coverageReporters: ['cobertura', 'text', 'lcov'],
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: 'test-results', outputName: 'junit.xml' }]
  ],
  transformIgnorePatterns: [
    "/node_modules/(?!(jose|jwks-rsa)/)"
  ]
};
