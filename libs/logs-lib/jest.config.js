module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  roots: ['<rootDir>'],
  testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/config/env.ts',
    '!src/types/*.ts',
    '!src/redis/client.ts'
  ],
  coverageReporters: ['cobertura', 'text', 'lcov'],
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: 'test-results', outputName: 'junit.xml' }]
  ],
  moduleNameMapper: {
    '^uuid$': '<rootDir>/tests/mocks/uuid.ts',
  },
};