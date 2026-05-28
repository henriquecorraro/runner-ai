'use strict';

const { spawnSync } = require('node:child_process');
const { ensureString } = require('./utils');
const { ROOT } = require('./ecosystems');

function runWithRunner(args, getEcosystem) {
  const ecosystem = getEcosystem(args.ecosystem);
  if (args.userConfirmedRunner !== true) throw new Error('Runner execution requires userConfirmedRunner: true.');

  const selection = ensureString(args.selection, 'selection');
  const dryRun = args.dryRun !== false;
  const commandArgs = ['run', 'tasks', '--', '--config', ecosystem.configPath];

  const selectionMap = {
    task: () => commandArgs.push('--task', ensureString(args.value, 'value')),
    scope: () => commandArgs.push('--scope', ensureString(args.value, 'value')),
    feature: () => commandArgs.push('--feature', ensureString(args.value, 'value')),
    'open-tasks': () => commandArgs.push('--open-tasks'),
    'open-scopes': () => commandArgs.push('--open-scopes'),
  };

  if (!selectionMap[selection]) throw new Error('Field "selection" must be one of: task, scope, feature, open-tasks, open-scopes.');
  selectionMap[selection]();

  if (args.agent) commandArgs.push('--agent', ensureString(args.agent, 'agent'));
  if (dryRun) commandArgs.push('--dry-run');

  const result = spawnSync('npm', commandArgs, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 });
  return { command: `npm ${commandArgs.join(' ')}`, exitCode: result.status, stdout: result.stdout, stderr: result.stderr, dryRun };
}

module.exports = { runWithRunner };
