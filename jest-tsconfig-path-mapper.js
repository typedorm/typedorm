const tsConfig = require('./tsconfig.json');
module.exports = function () {
  const paths = tsConfig.compilerOptions.paths;

  return Object.keys(paths).reduce((acc, key) => {
    const jcPathKey = key.replace(/\*/, '(.*)');
    const pathValue = paths[key];

    const jcPathValues = pathValue.map(path => {
      return `<rootDir>/${path}`.replace(/\*/, '$1');
    });

    acc[jcPathKey] = jcPathValues;
    return acc;
  }, {});
};
