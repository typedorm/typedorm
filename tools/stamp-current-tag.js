const {exec} = require('./util');

const argsWithoutNode = process.argv.slice(1);
process.on('uncaughtException', () => {
  console.error('Failed to execute:', argsWithoutNode.join(' '));
});

// this defines what branches deploys to which channel
const releaseConfig = {
  main: 'latest',
  beta: 'beta',
  next: 'next',
  alpha: 'alpha',
};

const currentBranch = exec('git rev-parse --abbrev-ref HEAD');

if (!currentBranch) {
  console.error('No git branch can be resolved.');
  console.error(
    'Make sure this command is being run from a git repository, or you have proper access to list current active branch.'
  );
  console.error(
    '       Error running command: git rev-parse --abbrev-ref HEAD'
  );
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

const BUILD_SCM_TAG = releaseConfig[currentBranch];
console.log(`BUILD_SCM_TAG ${BUILD_SCM_TAG}`);
