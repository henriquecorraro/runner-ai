'use strict';

const { spawnSync } = require('node:child_process');
const { ensureString, normalizeSearchValue } = require('./utils');
const { ROOT } = require('./ecosystems');
const { listTasks, resolveTask, setTaskBoardStatus } = require('./tasks');

const ACTIONABLE_TASK_STATUSES = new Set(['open', 'needs-rework']);

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

  const boardSync = [];
  const selectedTaskIds = dryRun ? [] : resolveSelectedTaskIds(ecosystem, selection, args.value);
  for (const taskId of selectedTaskIds) {
    boardSync.push(setTaskBoardStatus({ ecosystem: ecosystem.directoryName, task: taskId, status: 'in-progress' }, () => ecosystem));
  }

  const result = spawnSync('npm', commandArgs, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 });

  if (!dryRun && result.status === 0) {
    for (const taskId of selectedTaskIds) {
      boardSync.push(setTaskBoardStatus({ ecosystem: ecosystem.directoryName, task: taskId, status: 'testing' }, () => ecosystem));
    }
  }

  return { command: `npm ${commandArgs.join(' ')}`, exitCode: result.status, stdout: result.stdout, stderr: result.stderr, dryRun, boardSync };
}

function resolveSelectedTaskIds(ecosystem, selection, value) {
  const tasks = listTasks(ecosystem);
  if (selection === 'task') return [resolveTask(ecosystem, ensureString(value, 'value')).id];

  if (selection === 'feature') {
    const normalizedFeature = normalizeSearchValue(ensureString(value, 'value'));
    const matches = tasks.filter((task) => [task.id, task.fileName, task.title].some((candidate) => normalizeSearchValue(candidate).includes(normalizedFeature)));
    if (matches.length === 0) throw new Error(`Feature "${value}" did not match any central ecosystem task.`);
    if (matches.length > 1) throw new Error(`Feature "${value}" matched multiple tasks: ${matches.map((task) => task.fileName).join(', ')}.`);
    return [matches[0].id];
  }

  if (selection === 'scope') {
    const scope = ensureString(value, 'value');
    const matches = tasks.filter((task) => task.scope === scope);
    if (matches.length === 0) throw new Error(`Scope "${scope}" did not match any central ecosystem task.`);
    return matches.map((task) => task.id);
  }

  if (selection === 'open-tasks' || selection === 'open-scopes') {
    const matches = tasks.filter((task) => ACTIONABLE_TASK_STATUSES.has(task.status));
    if (matches.length === 0) throw new Error('No actionable tasks were found in the central ecosystem SDD.');
    return matches.map((task) => task.id);
  }

  throw new Error('Field "selection" must be one of: task, scope, feature, open-tasks, open-scopes.');
}

module.exports = { runWithRunner };
