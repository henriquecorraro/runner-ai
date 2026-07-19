#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const result = spawnSync(
  'python3',
  ['-m', 'runners.generic', ...process.argv.slice(2)],
  { cwd: ROOT, env: process.env, stdio: 'inherit' },
);

if (result.error) {
  console.error(`[ws-runner] failed: ${result.error.message}`);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
