const { execSync } = require('child_process');

// Runs in execSync so that it can easily work with nodemon
execSync(
  `cd examples && rm -rf node_modules && npm i --silent && ts-node -T ../src/index.ts \"*.machine.ts\" --once && npm run build`,
  {
    stdio: 'inherit',
  },
);
