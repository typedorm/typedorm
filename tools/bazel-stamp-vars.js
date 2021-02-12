const {exec} = require('./util');

const argsWithoutNode = process.argv.slice(1);
process.on('uncaughtException', () => {
  console.error('Failed to execute:', argsWithoutNode.join(' '));
});

const BUILD_SCM_HASH = exec('git rev-parse HEAD');
console.log(`BUILD_SCM_HASH ${BUILD_SCM_HASH}`);

const BUILD_SCM_VERSION_RAW = exec(
  'git describe --match "v[0-9]*.[0-9]*.[0-9]*" --abbrev=7 --tags HEAD'
);

if (!BUILD_SCM_VERSION_RAW) {
  console.error("No git tags found, can't stamp the build.");
  console.error('Please fetch the tags first:');
  return;
}

const BUILD_SCM_VERSION = BUILD_SCM_VERSION_RAW.replace(
  /-([0-9]+)-g/,
  '+$1.sha-'
);

console.log(`BUILD_SCM_VERSION ${BUILD_SCM_VERSION}`);
