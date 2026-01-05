const fs = require('fs');
const path = require('path');

const timestamp = Date.now();
const buildDate = new Date().toISOString();
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

const versionInfo = {
  version: packageJson.version,
  buildId: timestamp.toString(),
  buildDate: buildDate
};

const versionPath = path.join(__dirname, '..', 'version.json');
const publicVersionPath = path.join(__dirname, '..', 'public', 'version.json');

fs.writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2));
fs.writeFileSync(publicVersionPath, JSON.stringify(versionInfo, null, 2));

console.log(`✅ Build version: ${versionInfo.version} (${versionInfo.buildId})`);
