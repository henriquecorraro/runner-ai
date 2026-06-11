#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const { ensureString, ensureStringArray } = require('../lib/utils');
const { listEcosystems, getEcosystem, ROOT } = require('../lib/ecosystems');
const { VALID_TASK_STATUSES, listTasks, resolveTask, summarizeTask, rememberActiveTasks, getActiveTasks, createTask, setTaskStatus } = require('../lib/tasks');
const { runWithRunner } = require('../lib/runner');
const { launchParallel, getParallelStatus, listParallelRuns, MAX_CONCURRENCY } = require('../lib/parallel-runner');

// --- JSON-RPC helpers ---

function jsonResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function jsonError(id, code, message, data = undefined) {
  return { jsonrpc: '2.0', id, error: { code, message, ...(data === undefined ? {} : { data }) } };
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function toolContent(value) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}

// --- Tool definitions ---

const tools = [
  {
    name: 'get_operating_context',
    description: 'Return the ecosystem-ai-runner operating rules. Use this before planning or executing ecosystem tasks.',
    inputSchema: { type: 'object', properties: { ecosystem: { type: 'string', description: 'Optional ecosystem name.' } } },
  },
  {
    name: 'list_ecosystems',
    description: 'List configured ecosystems and their repositories.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_tasks',
    description: 'List centralized tasks for one ecosystem, optionally filtered by status or scope.',
    inputSchema: {
      type: 'object', required: ['ecosystem'],
      properties: { ecosystem: { type: 'string' }, status: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] }, scope: { type: 'string' } },
    },
  },
  {
    name: 'get_task',
    description: 'Load one task for execution in the current chat/agent.',
    inputSchema: { type: 'object', required: ['ecosystem', 'task'], properties: { ecosystem: { type: 'string' }, task: { type: 'string', description: 'Task id, filename, or unique fragment.' } } },
  },
  {
    name: 'get_active_tasks',
    description: 'Return task ids remembered as active in this MCP session.',
    inputSchema: { type: 'object', required: ['ecosystem'], properties: { ecosystem: { type: 'string' } } },
  },
  {
    name: 'remember_active_tasks',
    description: 'Remember task ids from the current conversation for contextual references.',
    inputSchema: { type: 'object', required: ['ecosystem', 'tasks'], properties: { ecosystem: { type: 'string' }, tasks: { type: 'array', items: { type: 'string' } }, reason: { type: 'string' } } },
  },
  {
    name: 'create_task',
    description: 'Create a centralized task file. Titles and body must be in English. Body must be terse machine-readable specs for AI agent execution: declarative, structured, zero prose. Follow taskWritingRules from get_operating_context.',
    inputSchema: {
      type: 'object', required: ['ecosystem', 'title', 'repositories', 'body'],
      properties: { ecosystem: { type: 'string' }, id: { type: 'string' }, title: { type: 'string' }, scope: { type: 'string' }, repositories: { type: 'array', items: { type: 'string' } }, validation: { type: 'array', items: { type: 'string' } }, docsTargets: { type: 'array', items: { type: 'string' } }, dependsOn: { type: 'array', items: { type: 'string' } }, body: { type: 'string' } },
    },
  },
  {
    name: 'set_task_status',
    description: 'Update a task status. Requires userValidated: true for done.',
    inputSchema: { type: 'object', required: ['ecosystem', 'task', 'status'], properties: { ecosystem: { type: 'string' }, task: { type: 'string' }, status: { type: 'string', enum: [...VALID_TASK_STATUSES] }, userValidated: { type: 'boolean' } } },
  },
  {
    name: 'run_with_runner',
    description: 'Run the isolated ecosystem runner. Use only after explicit user choice; dryRun defaults to true.',
    inputSchema: {
      type: 'object', required: ['ecosystem', 'selection', 'userConfirmedRunner'],
      properties: { ecosystem: { type: 'string' }, selection: { type: 'string', enum: ['task', 'scope', 'feature', 'open-tasks', 'open-scopes'] }, value: { type: 'string' }, agent: { type: 'string' }, dryRun: { type: 'boolean' }, userConfirmedRunner: { type: 'boolean' } },
    },
  },
  {
    name: 'run_parallel',
    description: `Launch ecosystem tasks in parallel (up to ${MAX_CONCURRENCY} physical cores). Each task runs in its own process/core. Returns a runId to monitor progress.`,
    inputSchema: {
      type: 'object', required: ['ecosystem', 'taskIds', 'userConfirmedRunner'],
      properties: {
        ecosystem: { type: 'string' },
        taskIds: { type: 'array', items: { type: 'string' }, description: 'Task IDs to execute in parallel.' },
        agent: { type: 'string', description: 'Agent name (default: ecosystem default).' },
        concurrency: { type: 'number', description: `Max parallel workers. Default: ${MAX_CONCURRENCY} (physical cores).` },
        userConfirmedRunner: { type: 'boolean' },
      },
    },
  },
  {
    name: 'parallel_status',
    description: 'Check status of a parallel run. Shows progress, per-task status, and live log tail.',
    inputSchema: {
      type: 'object', required: ['runId'],
      properties: {
        runId: { type: 'string', description: 'The parallel run ID returned by run_parallel.' },
        taskId: { type: 'string', description: 'Optional: get detailed status + log tail for one specific task.' },
      },
    },
  },
  {
    name: 'list_parallel_runs',
    description: 'List all active parallel runs with their progress.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'run_kiro_parallel',
    description: `Launch ecosystem tasks in parallel using kiro-cli agents (up to ${MAX_CONCURRENCY} cores). Each task runs in its own kiro-cli process. Use when user asks to run tasks with kiro runner. Returns a runId to monitor with parallel_status.`,
    inputSchema: {
      type: 'object', required: ['ecosystem', 'userConfirmedRunner'],
      properties: {
        ecosystem: { type: 'string' },
        taskIds: { type: 'array', items: { type: 'string' }, description: 'Task IDs to execute. If omitted with openTasks=true, runs all actionable tasks.' },
        scope: { type: 'string', description: 'Run all actionable tasks in this scope.' },
        openTasks: { type: 'boolean', description: 'Run all open/needs-rework tasks.' },
        concurrency: { type: 'number', description: `Max parallel workers. Default: ${MAX_CONCURRENCY}.` },
        model: { type: 'string', description: 'Model override (e.g. claude-opus-4).' },
        effort: { type: 'string', description: 'Effort level: low, medium, high, xhigh, max. Default: max.' },
        userConfirmedRunner: { type: 'boolean' },
      },
    },
  },
];

// --- Tool handlers ---

function getOperatingContext(args) {
  const ecosystem = args.ecosystem ? getEcosystem(args.ecosystem) : null;
  const sharedSkillsDir = path.join(ROOT, 'skills');
  const sharedSkills = fs.existsSync(sharedSkillsDir)
    ? fs.readdirSync(sharedSkillsDir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && fs.existsSync(path.join(sharedSkillsDir, e.name, 'SKILL.md')))
        .map((e) => ({ name: e.name, path: path.join(sharedSkillsDir, e.name, 'SKILL.md') }))
    : [];

  return {
    repositoryRoot: ROOT,
    currentChatDefault: true,
    runnerRequiresExplicitUserChoice: true,
    contextualTaskReferencesUseCurrentConversationFirst: true,
    guidance: [
      'ENGLISH FIRST for ecosystem SDD artifacts.',
      'Use the current chat/agent for task execution by default.',
      'Resolve contextual task references against the current conversation first.',
      'Use the runner only when the user explicitly asks.',
      'Do not mark tasks done until the user confirms validation.',
    ],
    taskWritingRules: [
      'Tasks are consumed EXCLUSIVELY by AI agents. Never write for humans.',
      'Terse, declarative, structured. Zero prose, zero motivational context, zero transitions.',
      'State: what to do, constraints, expected output. Nothing else.',
      'Use tables for schemas, mappings, and enumerations.',
      'Use code blocks for SQL, TypeScript types, file paths, and shell commands.',
      'Include exact SQL queries when DB access is involved.',
      'Include TypeScript type shapes for request/response contracts.',
      'Include file paths where code should be created/modified.',
      'Include static data maps (enums, status codes) inline — never say "see table X".',
      'Include value conversion rules (e.g., BRL decimal → cents).',
      'Include error cases and their expected HTTP status codes.',
      'Mention what NOT to do when there is a common pitfall.',
      'Never use "Context" sections explaining background, narrative paragraphs, or sentences like "The new platform needs...".',
      'Never explain WHY something is needed — only WHAT and HOW.',
      'Use imperative mood: "must", "do", "return" — never "should", "could", "might".',
    ],
    sharedSkills,
    ecosystem,
    activeTasks: ecosystem ? getActiveTasks(ecosystem.directoryName) : [],
  };
}

// --- Kiro parallel runner ---

const kiroRuns = new Map();

function launchKiroParallel(args) {
  if (args.userConfirmedRunner !== true) throw new Error('Kiro runner requires userConfirmedRunner: true.');
  const eco = getEcosystem(args.ecosystem);

  const runId = `kiro-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const pyArgs = ['-m', 'runners.kiro', '--config', eco.configPath, '--run-id', runId, '--no-tui'];

  if (args.taskIds && args.taskIds.length > 0) {
    for (const id of ensureStringArray(args.taskIds, 'taskIds', true)) {
      pyArgs.push('--task', id);
    }
  } else if (args.scope) {
    pyArgs.push('--scope', ensureString(args.scope, 'scope'));
  } else if (args.openTasks) {
    pyArgs.push('--open-tasks');
  } else {
    throw new Error('Provide taskIds, scope, or openTasks: true.');
  }

  if (args.concurrency) pyArgs.push('--concurrency', String(args.concurrency));

  const env = { ...process.env };
  if (args.model) env.KIRO_MODEL = args.model;
  if (args.effort) env.KIRO_EFFORT = args.effort;

  const logsDir = path.join(ROOT, 'ecosystems', eco.directoryName, 'runs', runId);
  fs.mkdirSync(logsDir, { recursive: true });
  const orchestratorLog = path.join(logsDir, 'orchestrator.log');
  const logStream = fs.createWriteStream(orchestratorLog, { flags: 'w' });

  const { spawn } = require('node:child_process');
  const child = spawn('python3', pyArgs, { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });

  const state = { runId, ecosystem: eco.directoryName, pid: child.pid, status: 'running', startedAt: new Date().toISOString(), finishedAt: null, exitCode: null, lastLines: [], logsDir };
  kiroRuns.set(runId, state);

  child.stdout.on('data', (chunk) => {
    logStream.write(chunk);
    const lines = chunk.toString().split('\n').filter(Boolean);
    state.lastLines = lines.slice(-10);
  });
  child.stderr.on('data', (chunk) => { logStream.write(chunk); });
  child.on('close', (code) => {
    logStream.end();
    state.status = code === 0 ? 'success' : 'failed';
    state.exitCode = code;
    state.finishedAt = new Date().toISOString();
  });
  child.on('error', (err) => {
    logStream.end();
    state.status = 'failed';
    state.exitCode = -1;
    state.error = err.message;
    state.finishedAt = new Date().toISOString();
  });

  return { runId, ecosystem: eco.directoryName, pid: child.pid, logsDir, message: `Kiro runner started. Monitor with parallel_status(runId="${runId}") or check ${logsDir}` };
}

// --- Tool handlers ---

function callTool(name, args = {}) {
  switch (name) {
    case 'get_operating_context': return getOperatingContext(args);
    case 'list_ecosystems': return { ecosystems: listEcosystems() };
    case 'list_tasks': {
      const eco = getEcosystem(args.ecosystem);
      return { ecosystem: eco.directoryName, tasks: listTasks(eco, args).map(summarizeTask) };
    }
    case 'get_task': {
      const eco = getEcosystem(args.ecosystem);
      const task = resolveTask(eco, args.task);
      rememberActiveTasks(eco.directoryName, [task.id], 'loaded-by-mcp');
      return { ecosystem: eco.directoryName, task };
    }
    case 'get_active_tasks': {
      const eco = getEcosystem(args.ecosystem);
      return { ecosystem: eco.directoryName, activeTasks: getActiveTasks(eco.directoryName) };
    }
    case 'remember_active_tasks': {
      const eco = getEcosystem(args.ecosystem);
      const taskIds = ensureStringArray(args.tasks, 'tasks', true);
      const resolved = taskIds.map((id) => resolveTask(eco, id));
      rememberActiveTasks(eco.directoryName, resolved.map((t) => t.id), args.reason || 'remembered-by-agent');
      return { ecosystem: eco.directoryName, activeTasks: getActiveTasks(eco.directoryName) };
    }
    case 'create_task': return createTask(args, getEcosystem);
    case 'set_task_status': return setTaskStatus(args, getEcosystem);
    case 'run_with_runner': return runWithRunner(args, getEcosystem);
    case 'run_parallel': {
      if (args.userConfirmedRunner !== true) throw new Error('Parallel execution requires userConfirmedRunner: true.');
      const eco = getEcosystem(args.ecosystem);
      const taskIds = ensureStringArray(args.taskIds, 'taskIds', true);
      return launchParallel({ ecosystem: eco, taskIds, agent: args.agent, concurrency: args.concurrency });
    }
    case 'parallel_status': {
      if (kiroRuns.has(args.runId)) {
        const kr = kiroRuns.get(args.runId);
        const result = { ...kr };
        // Read last lines from orchestrator log
        const logPath = path.join(kr.logsDir, 'orchestrator.log');
        if (fs.existsSync(logPath)) {
          const content = fs.readFileSync(logPath, 'utf8');
          result.tailLog = content.split('\n').slice(-20).join('\n');
        }
        return result;
      }
      return getParallelStatus(args.runId, args.taskId);
    }
    case 'list_parallel_runs': {
      const codexRuns = listParallelRuns();
      const kiro = [...kiroRuns.values()].map((r) => ({ runId: r.runId, ecosystem: r.ecosystem, type: 'kiro', status: r.status, pid: r.pid, startedAt: r.startedAt }));
      return [...codexRuns.map((r) => ({ ...r, type: 'codex' })), ...kiro];
    }
    case 'run_kiro_parallel': return launchKiroParallel(args);
    default: throw new Error(`Unknown tool: ${name}`);
  }
}

// --- MCP server ---

async function handleMessage(message) {
  if (message.method === 'initialize') {
    return jsonResult(message.id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'ecosystem-ai-runner', version: '0.2.0' },
    });
  }
  if (message.method === 'notifications/initialized') return null;
  if (message.method === 'tools/list') return jsonResult(message.id, { tools });
  if (message.method === 'tools/call') {
    const { name, arguments: toolArgs } = message.params || {};
    return jsonResult(message.id, toolContent(callTool(name, toolArgs || {})));
  }
  return jsonError(message.id, -32601, `Method not found: ${message.method}`);
}

const rl = readline.createInterface({ input: process.stdin });

rl.on('line', async (line) => {
  if (!line.trim()) return;
  let message;
  try { message = JSON.parse(line); } catch (error) { send(jsonError(null, -32700, 'Parse error', error.message)); return; }
  try {
    const response = await handleMessage(message);
    if (response) send(response);
  } catch (error) { send(jsonError(message.id, -32000, error.message)); }
});
