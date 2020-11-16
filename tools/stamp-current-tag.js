const {exec} = require('./util');

const argsWithoutNode = process.argv.slice(1);
process.on('uncaughtException', () => {
  console.error('Failed to execute:', argsWithoutNode.join(' '));
});

// this defines what branches deploys to which channel
const releaseConfig = {
  main: 'latest',
  develop: 'beta',
  next: 'next',
};

const currentBranch = exec('git branch --show-current');

if (!currentBranch) {
  console.error('No git branch can be resolved.');
  console.error(
    'Make sure this command is being run from a git repository, or you have proper access to list current active branch.'
  );
  console.error('       Error running command: git branch --show-current');
  return;
}

if (!releaseConfig[currentBranch]) {
  console.error(
    `Release is not allowed from branch ${currentBranch}, it must be run from one of ${Object.keys(
      releaseConfig
    ).toString()}`
  );
  return;
}

const BUILD_SCM_TAG = currentBranch;
console.log(`BUILD_SCM_TAG ${BUILD_SCM_TAG}`);
