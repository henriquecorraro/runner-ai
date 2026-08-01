'use strict';

const { spawnSync } = require('node:child_process');
const os = require('node:os');
const { ensureString, ensurePositiveInteger } = require('./utils');
const { ROOT } = require('./workspaces');

function buildRunnerArgs(ws, args = {}) {
  const commandArgs = ['-m', 'runners.generic', '--config', ws.configPath, '--no-tui'];

  if (Array.isArray(args.taskIds) && args.taskIds.length > 0) {
    for (const taskId of args.taskIds) commandArgs.push('--task', ensureString(taskId, 'taskIds'));
  } else if (args.selection === 'task') {
    commandArgs.push('--task', ensureString(args.value, 'value'));
  } else if (args.scope || args.selection === 'scope') {
    commandArgs.push('--scope', ensureString(args.scope || args.value, 'scope'));
  } else if (args.selection === 'feature') {
    commandArgs.push('--feature', ensureString(args.value, 'value'));
  } else if (args.openTasks || args.selection === 'open-tasks') {
    commandArgs.push('--open-tasks');
  } else if (args.selection === 'open-scopes') {
    commandArgs.push('--open-scopes');
  } else {
    throw new Error('Select tasks with taskIds, task, feature, scope, open-tasks, or open-scopes.');
  }

  if (args.agent) commandArgs.push('--agent', ensureString(args.agent, 'agent'));
  if (args.allowAgentOverride === true) {
    if (!args.agent) throw new Error('Field "allowAgentOverride" requires "agent".');
    commandArgs.push('--allow-agent-override');
  }
  if (args.concurrency !== undefined && args.concurrency !== null) {
    commandArgs.push('--concurrency', String(ensurePositiveInteger(args.concurrency, 'concurrency', os.cpus().length)));
  }
  if (args.runId) {
    const runId = ensureString(args.runId, 'runId');
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(runId)) {
      throw new Error('Field "runId" may contain only letters, numbers, dots, underscores, and hyphens.');
    }
    commandArgs.push('--run-id', runId);
  }
  if (args.batchRelatedTasks === true) commandArgs.push('--batch-related');
  if (args.batchSize !== undefined) {
    commandArgs.push('--batch-size', String(ensurePositiveInteger(args.batchSize, 'batchSize', 12)));
  }
  if (args.dryRun) commandArgs.push('--dry-run');

  return commandArgs;
}

function runWithRunner(args, getWorkspace) {
  const ws = getWorkspace(args.workspace);
  if (args.userConfirmedRunner !== true) throw new Error('Runner execution requires userConfirmedRunner: true.');

  const dryRun = args.dryRun !== false;
  const commandArgs = buildRunnerArgs(ws, { ...args, dryRun });
  const result = spawnSync('python3', commandArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10,
    timeout: 4 * 60 * 60 * 1000,
  });

  if (result.error) throw result.error;
  return {
    command: `python3 ${commandArgs.join(' ')}`,
    exitCode: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    dryRun,
  };
}

module.exports = { buildRunnerArgs, runWithRunner };
