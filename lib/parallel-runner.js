'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { ROOT } = require('./ecosystems');
const { setTaskBoardStatus } = require('./tasks');

const MAX_CONCURRENCY = os.cpus().length;

// In-memory state for parallel runs
const runs = new Map();

function generateRunId() {
  return `par-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildTaskCommand(ecosystem, taskId, agent) {
  const args = ['run', 'tasks', '--', '--config', ecosystem.configPath, '--task', taskId];
  if (agent) args.push('--agent', agent);
  return args;
}

function spawnTask(ecosystem, taskId, agent, runId) {
  const run = runs.get(runId);
  const taskState = run.tasks.get(taskId);
  taskState.status = 'running';
  taskState.startedAt = new Date().toISOString();

  try {
    taskState.boardSync.push(setTaskBoardStatus({ ecosystem: ecosystem.directoryName, task: taskId, status: 'in-progress' }, () => ecosystem));
  } catch (error) {
    taskState.status = 'failed';
    taskState.exitCode = -1;
    taskState.error = `Board sync failed before execution: ${error.message}`;
    taskState.finishedAt = new Date().toISOString();
    run.completed += 1;
    scheduleNext(run, ecosystem, agent, runId);
    return;
  }

  const args = buildTaskCommand(ecosystem, taskId, agent);
  const logFile = path.join(run.logsDir, `${taskId}.log`);
  const logStream = fs.createWriteStream(logFile, { flags: 'w' });

  taskState.logFile = logFile;

  const child = spawn('npm', args, {
    cwd: ROOT,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => {
    logStream.write(chunk);
    const lines = chunk.toString().split('\n').filter(Boolean);
    taskState.lastLines = lines.slice(-5);
  });

  child.stderr.on('data', (chunk) => {
    logStream.write(chunk);
  });

  child.on('close', (code) => {
    logStream.end();
    taskState.status = code === 0 ? 'success' : 'failed';
    taskState.exitCode = code;
    taskState.finishedAt = new Date().toISOString();
    if (code === 0) {
      try {
        taskState.boardSync.push(setTaskBoardStatus({ ecosystem: ecosystem.directoryName, task: taskId, status: 'testing' }, () => ecosystem));
      } catch (error) {
        taskState.status = 'failed';
        taskState.exitCode = -1;
        taskState.error = `Board sync failed after execution: ${error.message}`;
      }
    }
    run.completed += 1;

    // Launch next queued task
    scheduleNext(run, ecosystem, agent, runId);
  });

  child.on('error', (err) => {
    logStream.end();
    taskState.status = 'failed';
    taskState.exitCode = -1;
    taskState.error = err.message;
    taskState.finishedAt = new Date().toISOString();
    run.completed += 1;
    scheduleNext(run, ecosystem, agent, runId);
  });

  taskState.pid = child.pid;
}

function scheduleNext(run, ecosystem, agent, runId) {
  if (run.queue.length === 0) return;
  if (getRunningCount(run) >= run.concurrency) return;

  const nextTaskId = run.queue.shift();
  spawnTask(ecosystem, nextTaskId, agent, runId);
}

function getRunningCount(run) {
  let count = 0;
  for (const [, t] of run.tasks) {
    if (t.status === 'running') count += 1;
  }
  return count;
}

/**
 * Launch parallel execution of tasks.
 * @param {object} params
 * @param {object} params.ecosystem - resolved ecosystem object
 * @param {string[]} params.taskIds - task IDs to execute
 * @param {string} [params.agent] - agent name
 * @param {number} [params.concurrency] - max parallel (default: physical cores)
 * @returns {object} run status
 */
function launchParallel({ ecosystem, taskIds, agent, concurrency }) {
  const runId = generateRunId();
  const maxConcurrent = Math.min(concurrency || MAX_CONCURRENCY, taskIds.length);
  const logsDir = path.join(ROOT, 'ecosystems', ecosystem.directoryName, 'runs', runId);
  fs.mkdirSync(logsDir, { recursive: true });

  const taskMap = new Map();
  for (const id of taskIds) {
    taskMap.set(id, {
      id,
      status: 'queued',
      startedAt: null,
      finishedAt: null,
      exitCode: null,
      pid: null,
      logFile: null,
      lastLines: [],
      error: null,
      boardSync: [],
    });
  }

  const run = {
    id: runId,
    ecosystem: ecosystem.directoryName,
    concurrency: maxConcurrent,
    total: taskIds.length,
    completed: 0,
    tasks: taskMap,
    queue: [...taskIds],
    logsDir,
    startedAt: new Date().toISOString(),
  };

  runs.set(runId, run);

  // Launch initial batch up to concurrency
  const initialBatch = run.queue.splice(0, maxConcurrent);
  for (const taskId of initialBatch) {
    spawnTask(ecosystem, taskId, agent, runId);
  }

  return {
    runId,
    concurrency: maxConcurrent,
    totalTasks: taskIds.length,
    logsDir,
    tasks: taskIds.map((id) => {
      const task = taskMap.get(id);
      return { id, status: task.status, boardSync: task.boardSync };
    }),
  };
}

/**
 * Get status of a parallel run.
 */
function getParallelStatus(runId, taskId) {
  const run = runs.get(runId);
  if (!run) throw new Error(`Parallel run "${runId}" not found. Active runs: ${[...runs.keys()].join(', ') || 'none'}`);

  if (taskId) {
    const t = run.tasks.get(taskId);
    if (!t) throw new Error(`Task "${taskId}" not found in run "${runId}".`);

    const result = { ...t };
    // Include last log lines for live monitoring
    if (t.logFile && fs.existsSync(t.logFile)) {
      const content = fs.readFileSync(t.logFile, 'utf8');
      const lines = content.split('\n');
      result.tailLog = lines.slice(-20).join('\n');
    }
    return result;
  }

  const summary = {
    runId: run.id,
    ecosystem: run.ecosystem,
    concurrency: run.concurrency,
    startedAt: run.startedAt,
    progress: `${run.completed}/${run.total}`,
    tasks: [],
  };

  for (const [, t] of run.tasks) {
    summary.tasks.push({
      id: t.id,
      status: t.status,
      pid: t.pid,
      exitCode: t.exitCode,
      startedAt: t.startedAt,
      finishedAt: t.finishedAt,
      boardSync: t.boardSync,
    });
  }

  return summary;
}

/**
 * List all active parallel runs.
 */
function listParallelRuns() {
  const result = [];
  for (const [, run] of runs) {
    result.push({
      runId: run.id,
      ecosystem: run.ecosystem,
      concurrency: run.concurrency,
      progress: `${run.completed}/${run.total}`,
      startedAt: run.startedAt,
    });
  }
  return result;
}

module.exports = { launchParallel, getParallelStatus, listParallelRuns, MAX_CONCURRENCY };
