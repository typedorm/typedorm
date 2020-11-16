module.exports = {
  testEnvironment: 'node',
  verbose: true,
  preset: 'ts-jest',
  transform: {'^.+\\.jsx?$': 'babel-jest'},
  testMatch: ['**/*.test.js', '**/*.spec.js', '**/*.test.ts', '**/*.spec.ts'],
  modulePathIgnorePatterns: ['dist', 'bin', 'bazel-out', 'node_modules'],
};
