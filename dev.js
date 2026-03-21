#!/usr/bin/env node
const { execSync } = require('child_process');
const script = process.platform === 'win32' ? 'dev.bat' : 'sh dev.sh';
execSync(script, { stdio: 'inherit' });
