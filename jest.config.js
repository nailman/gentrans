/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@google/genai$': '<rootDir>/src/__mocks__/@google/genai.ts',
    '^openai$': '<rootDir>/src/__mocks__/openai.ts',
  },
};
