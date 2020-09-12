const { execSync } = require('child_process');

// Runs in execSync so that it can easily work with nodemon
execSync(`cd examples && rm -rf node_modules && npm i --silent`, {
  stdio: 'inherit',
});

execSync(
  `cd examples && ${
    // If in CI, use node. If in local development, use ts-node
    process.env.CI ? 'node ../bin/index.js' : 'ts-node -T ../src/index.ts'
  } "*.machine.ts" --once`,
  {
    stdio: 'inherit',
  },
);

execSync('cd examples && npm run build', {
  stdio: 'inherit',
});
