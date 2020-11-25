const {readdirSync} = require('fs');

const packages = () =>
  readdirSync('./packages', {withFileTypes: true})
    .filter(dir => dir.isDirectory())
    .map(dir => dir.name);

const validScopes = ['examples', ...packages()];
console.log('Valid Package scopes:', validScopes);

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', validScopes],
    'scope-case': [2, 'always', 'kebab-case'],
  },
};
