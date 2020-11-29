module.exports = {
  rootDir: './src',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  moduleNameMapper: {
    '^brahmos$': '<rootDir>/index.js',
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/jest.setup.js'],
  testPathIgnorePatterns: ['jest.setup.js', 'testUtils.js'],
};
