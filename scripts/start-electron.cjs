#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

// Set NODE_ENV for this process
process.env.NODE_ENV = 'development';

// Spawn electron with the environment variable using npx
const electron = spawn('npx', ['electron', '.'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: 'development'
  }
});

electron.on('exit', (code) => {
  process.exit(code || 0);
});
