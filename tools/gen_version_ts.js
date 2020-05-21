const fs = require('fs');
const packageJson = require('../package.json');
fs.writeFileSync('version.ts',
`// Auto-generated file: to update the version use 'npm version ...'
export const VERSION="${packageJson.version}";`);
