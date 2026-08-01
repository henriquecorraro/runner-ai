#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const readline = require('node:readline');
const { spawnSync } = require('node:child_process');

const { ensureString, ensureStringArray, ensurePositiveInteger } = require('../lib/utils');
const { writeFileAtomic } = require('../lib/frontmatter');
const { listWorkspaces, getWorkspace, ROOT } = require('../lib/workspaces');
const { createWorkspace } = require('../lib/workspace-create');
const {
  VALID_TASK_STATUSES,
  listTasks,
  resolveTask,
  summarizeTask,
  rememberActiveTasks,
  getActiveTasks,
  createTask,
  setTaskStatus,
  setTaskBoardStatus,
  startTaskExecution,
  finishTaskExecution,
  getTaskDiff,
  compactTaskContext,
  loadTaskContext,
} = require('../lib/tasks');
const { buildRunnerArgs, runWithRunner } = require('../lib/runner');
const { getMyActivity } = require('../lib/github-activity');
const { createGitHubProject } = require('../lib/github-project-create');
const { reconcile } = require('../lib/reconcile');

const MAX_CONCURRENCY = os.cpus().length;

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
  if (value && value.content && Array.isArray(value.content)) return value;
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}

function formatActivity(result) {
  const lines = [`Activity for ${result.user} | Project: ${result.project}`, `Period: ${result.since || 'all'} → ${result.until || 'now'}`, `Total items: ${result.totalItems}`, ''];
  for (const item of result.items) {
    lines.push(`- ${item.title}`);
    lines.push(`  Status: ${item.status || 'N/A'} | Type: ${item.type} | Updated: ${item.updatedAt}`);
    lines.push(`  URL: ${item.cardUrl}`);
    lines.push('');
  }
  return { content: [{ type: 'text', text: lines.join('\n') }] };
}

/**
 * Resolve workspace name from args, accepting both "workspace" and "ws" as parameter names.
 */
function resolveWsArg(args) {
  return args.workspace || args.ws;
}

// --- Tool definitions ---

const tools = [
  {
    name: 'get_operating_context',
    description: 'Return compact operating policy; verbose adds full authoring rules.',
    inputSchema: { type: 'object', properties: { workspace: { type: 'string' }, verbose: { type: 'boolean' } } },
  },
  {
    name: 'list_workspaces',
    description: 'List configured workspaces and their repositories.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'create_workspace',
    description: 'Create a workspace. Requires a Project URL or explicit skipGithubProject.',
    inputSchema: {
      type: 'object',
      required: ['name', 'repositories'],
      properties: {
        name: { type: 'string', description: 'Human-readable workspace name.' },
        directoryName: { type: 'string', description: 'Optional workspace directory slug. Defaults to a slug from name.' },
        githubProject: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'GitHub Projects v2 URL, e.g. https://github.com/orgs/<org>/projects/<number>.' },
          },
          required: ['url'],
        },
        githubProjectUrl: { type: 'string', description: 'Legacy shorthand for githubProject.url.' },
        skipGithubProject: { type: 'boolean', description: 'Set true only after the user explicitly confirms this workspace does not need a GitHub Project.' },
        repositories: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'path'],
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              path: { type: 'string', description: 'Existing local repository path, absolute or relative to the MCP process cwd.' },
              docsHints: { type: 'array', items: { type: 'string' } },
              validation: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        defaultAgent: { type: 'string' },
        agents: { type: 'object' },
        sddRoot: { type: 'string' },
        historyRoot: { type: 'string' },
        tokenPolicy: { type: 'object' },
        docsQualityBaseline: {
          type: 'array',
          items: {
            type: 'object',
            required: ['repository', 'score', 'label'],
            properties: {
              repository: { type: 'string' },
              score: { type: 'string' },
              label: { type: 'string' },
              evidenceFiles: { type: 'array', items: { type: 'string' } },
              missingAreas: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  },
  {
    name: 'list_tasks',
    description: 'List centralized tasks for one workspace, optionally filtered by status or scope.',
    inputSchema: {
      type: 'object', required: ['workspace'],
      properties: { workspace: { type: 'string' }, status: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] }, scope: { type: 'string' } },
    },
  },
  {
    name: 'get_task',
    description: 'Load a task plus budgeted cached context.',
    inputSchema: { type: 'object', required: ['workspace', 'task'], properties: { workspace: { type: 'string' }, task: { type: 'string' }, contextBudgetTokens: { type: 'integer', minimum: 1, maximum: 32000 } } },
  },
  {
    name: 'get_task_diff',
    description: 'Read one paginated repository diff for task review.',
    inputSchema: {
      type: 'object', required: ['workspace', 'task'],
      properties: { workspace: { type: 'string' }, task: { type: 'string' }, repository: { type: 'string' }, offset: { type: 'integer', minimum: 0 }, maxTokens: { type: 'integer', minimum: 1, maximum: 12000 } },
    },
  },
  {
    name: 'get_token_usage',
    description: 'Return measured or estimated runner token usage and cache effectiveness.',
    inputSchema: { type: 'object', required: ['workspace'], properties: { workspace: { type: 'string' } } },
  },
  {
    name: 'compact_task_context',
    description: 'Move a full context snapshot to the content store and leave a thin manifest.',
    inputSchema: { type: 'object', required: ['workspace', 'task'], properties: { workspace: { type: 'string' }, task: { type: 'string' } } },
  },
  {
    name: 'get_active_tasks',
    description: 'Return task ids remembered as active in this MCP session.',
    inputSchema: { type: 'object', required: ['workspace'], properties: { workspace: { type: 'string' } } },
  },
  {
    name: 'remember_active_tasks',
    description: 'Remember task ids from the current conversation for contextual references.',
    inputSchema: { type: 'object', required: ['workspace', 'tasks'], properties: { workspace: { type: 'string' }, tasks: { type: 'array', items: { type: 'string' } }, reason: { type: 'string' } } },
  },
  {
    name: 'create_task',
    description: 'Create an English, machine-oriented task with all-or-fail GitHub sync.',
    inputSchema: {
      type: 'object', required: ['workspace', 'title', 'repositories', 'body'],
      properties: { workspace: { type: 'string' }, id: { type: 'string' }, title: { type: 'string' }, scope: { type: 'string' }, repositories: { type: 'array', items: { type: 'string' } }, complexity: { type: 'string', enum: ['low', 'medium', 'high'] }, risk: { type: 'string', enum: ['low', 'medium', 'critical'] }, executionProfile: { type: 'string', enum: ['mechanical', 'standard', 'deep'] }, executionAgent: { type: 'string', description: 'Workspace agent id; never a shell command.' }, routingPolicy: { type: 'string', enum: ['pinned', 'preferred', 'portable'] }, preferredModel: { type: 'string' }, reasoningEffort: { type: 'string', enum: ['low', 'medium', 'high', 'xhigh'] }, validation: { type: 'array', items: { type: 'string' } }, docsTargets: { type: 'array', items: { type: 'string' } }, dependsOn: { type: 'array', items: { type: 'string' } }, body: { type: 'string' }, intent: { type: 'string', description: 'Human WHY; GitHub card only.' }, context: { type: 'string', description: 'Reusable code/contracts/decisions snapshot.' } },
    },
  },
  {
    name: 'set_task_status',
    description: 'Transition task state; done requires user validation and PR handoff.',
    inputSchema: {
      type: 'object',
      required: ['workspace', 'task', 'status'],
      properties: {
        workspace: { type: 'string' },
        task: { type: 'string' },
        status: { type: 'string', enum: [...VALID_TASK_STATUSES] },
        userValidated: { type: 'boolean' },
        closeoutSummary: { type: 'string', description: 'Brief summary of what was done, added to the GitHub card when closing.' },
        prHandoff: {
          type: 'object',
          description: 'Required when status is done. The agent must ask the user whether to skip PR, use existing PRs, or create new PRs automatically.',
          required: ['decision'],
          properties: {
            decision: { type: 'string', enum: ['skip', 'current-branch', 'new-branch', 'create'] },
            targetBranch: { type: 'string', description: 'PR target branch when PR handoff is selected.' },
            pullRequests: {
              type: 'array',
              description: 'Pull requests opened for this task, grouped by repository.',
              items: {
                type: 'object',
                required: ['repository', 'url'],
                properties: {
                  repository: { type: 'string' },
                  url: { type: 'string' },
                },
              },
            },
          },
        },
        pullRequests: {
          type: 'array',
          description: 'Legacy alias for prHandoff.pullRequests.',
          items: {
            type: 'object',
            required: ['repository', 'url'],
            properties: {
              repository: { type: 'string' },
              url: { type: 'string' },
            },
          },
        },
        comment: { type: 'string', description: 'Legacy alias for closeoutSummary.' },
      },
    },
  },
  {
    name: 'set_task_board_status',
    description: 'Move one task card between board lifecycle states.',
    inputSchema: {
      type: 'object',
      required: ['workspace', 'task', 'status'],
      properties: {
        workspace: { type: 'string' },
        task: { type: 'string', description: 'Task id, filename, or unique fragment.' },
        status: { type: 'string', enum: ['todo', 'in-progress', 'testing', 'done'] },
      },
    },
  },
  {
    name: 'start_task_execution',
    description: 'Start current-chat execution with cross-repo branch preflight.',
    inputSchema: {
      type: 'object',
      required: ['workspace', 'task'],
      properties: {
        workspace: { type: 'string' },
        task: { type: 'string', description: 'Task id, filename, or unique fragment.' },
        branchName: { type: 'string', description: 'Explicit branch name. Default: feat/<scope-slug>.' },
        baseBranch: { type: 'string', description: 'Base branch to create from. Default: main.' },
      },
    },
  },
  {
    name: 'finish_task_execution',
    description: 'Start a budgeted review; skipReview only after clean review and user confirmation.',
    inputSchema: {
      type: 'object',
      required: ['workspace', 'task'],
      properties: {
        workspace: { type: 'string' },
        task: { type: 'string', description: 'Task id, filename, or unique fragment.' },
        skipReview: { type: 'boolean', description: 'Set true only after the review loop passed and the user confirmed. Moves the task to Testing.' },
      },
    },
  },
  {
    name: 'run_with_runner',
    description: 'Run the isolated runner only after explicit user choice; defaults to dry-run.',
    inputSchema: {
      type: 'object', required: ['workspace', 'selection', 'userConfirmedRunner'],
      properties: { workspace: { type: 'string' }, selection: { type: 'string', enum: ['task', 'scope', 'feature', 'open-tasks', 'open-scopes'] }, value: { type: 'string' }, agent: { type: 'string' }, allowAgentOverride: { type: 'boolean', description: 'Required to replace a task pinned to another agent.' }, dryRun: { type: 'boolean' }, userConfirmedRunner: { type: 'boolean' } },
    },
  },
  {
    name: 'run_parallel',
    description: `Launch persisted parallel execution (max ${MAX_CONCURRENCY}); serializes shared repositories.`,
    inputSchema: {
      type: 'object', required: ['workspace', 'userConfirmedRunner'],
      properties: {
        workspace: { type: 'string' },
        taskIds: { type: 'array', items: { type: 'string' }, description: 'Task IDs to execute. If omitted, use scope or openTasks.' },
        scope: { type: 'string', description: 'Run all actionable tasks in this scope.' },
        openTasks: { type: 'boolean', description: 'Run all open/needs-rework tasks.' },
        agent: { type: 'string', description: 'Explicit agent override; without it, every task resolves its own routing.' },
        allowAgentOverride: { type: 'boolean', description: 'Allow the explicit agent to replace pinned task routing.' },
        concurrency: { type: 'integer', minimum: 1, maximum: MAX_CONCURRENCY, description: `Max parallel workers. Default: ${MAX_CONCURRENCY} available CPU cores.` },
        batchRelatedTasks: { type: 'boolean', description: 'Reuse one agent session for ready tasks with identical repository sets.' },
        batchSize: { type: 'integer', minimum: 1, maximum: 12 },
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
    description: 'List in-memory and persisted parallel runs with their progress.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_my_activity',
    description: 'Fetch the authenticated GitHub user\'s activity in a workspace\'s GitHub Project, filtered by date range. Use when the user asks what they did on a specific day or period.',
    inputSchema: {
      type: 'object', required: ['workspace'],
      properties: {
        workspace: { type: 'string' },
        since: { type: 'string', description: 'ISO date or date-time. Only items updated on or after this date.' },
        until: { type: 'string', description: 'ISO date or date-time. Only items updated on or before this date.' },
      },
    },
  },
  {
    name: 'create_github_project',
    description: 'Create and configure a GitHub Project v2 for a workspace.',
    inputSchema: {
      type: 'object', required: ['workspace', 'title'],
      properties: {
        workspace: { type: 'string' },
        title: { type: 'string', description: 'Title for the new GitHub Project.' },
      },
    },
  },
  {
    name: 'reconcile_workspace',
    description: 'Preview or reconcile local/GitHub task drift with an explicit direction.',
    inputSchema: {
      type: 'object', required: ['workspace'],
      properties: {
        workspace: { type: 'string' },
        dryRun: { type: 'boolean', description: 'If true (default), only report drift without fixing.' },
        direction: { type: 'string', enum: ['both', 'local-to-github', 'github-to-local'], description: 'Sync direction. Default: both.' },
      },
    },
  },
];

// --- Tool handlers ---

function getOperatingContext(args) {
  const wsName = resolveWsArg(args);
  const ws = wsName ? getWorkspace(wsName) : null;
  const sharedSkillsDir = path.join(ROOT, 'skills');
  const sharedSkills = fs.existsSync(sharedSkillsDir)
    ? fs.readdirSync(sharedSkillsDir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && fs.existsSync(path.join(sharedSkillsDir, e.name, 'SKILL.md')))
        .map((e) => ({ name: e.name, path: path.join(sharedSkillsDir, e.name, 'SKILL.md') }))
    : [];

  const compactGuidance = [
    'Write centralized SDD artifacts in English.',
    'Use current-chat execution by default; isolated runner requires explicit user choice.',
    'Use lifecycle gates and never mark done before user validation.',
    'Create tasks with terse specs, human intent, and a reusable context snapshot.',
    'Classify executable tasks with complexity, risk, and executionProfile for cost-aware model routing.',
    'Choose executionAgent and preferredModel only from workspace.agents; use pinned, preferred, or portable routingPolicy.',
    'Fetch large context and diffs incrementally within token budgets.',
  ];
  const compactRules = [
    'Imperative, structured, zero narrative.',
    'Include exact contracts, paths, validation, and error cases.',
    'Use tables/code only when they reduce ambiguity.',
  ];
  const fullGuidance = [
    ...compactGuidance,
    'Use create_workspace for deterministic workspace creation.',
    'Before create_workspace, ask for a GitHub Project URL unless the user explicitly confirms none is needed.',
    'With githubProject, create_task synchronizes every linked repository before recording local state.',
    'finish_task_execution previews a capped diff; use get_task_diff for missing pages.',
    'Runner success moves tasks to Testing; failures return to needs-rework/Todo.',
    'When closing, record PR handoff and closeout summary.',
  ];
  const fullRules = [
    ...compactRules,
    'Tasks are consumed exclusively by AI agents.',
    'State what to do, constraints, and expected output only.',
    'Include exact SQL, type shapes, value conversions, and HTTP errors when applicable.',
    'Mention prohibited common pitfalls.',
    'Never add narrative Context/WHY sections to local task bodies.',
  ];
  return {
    repositoryRoot: ROOT,
    policyVersion: 'compact-v1',
    currentChatDefault: true,
    runnerRequiresExplicitUserChoice: true,
    contextualTaskReferencesUseCurrentConversationFirst: true,
    guidance: args.verbose === true ? fullGuidance : compactGuidance,
    taskWritingRules: args.verbose === true ? fullRules : compactRules,
    sharedSkills,
    workspace: ws,
    activeTasks: ws ? getActiveTasks(ws.directoryName) : [],
  };
}

function getTokenUsage(ws) {
  const result = spawnSync(
    'python3',
    ['-m', 'runners.generic.context_cache', 'usage', '--config-dir', ws.wsDir],
    { cwd: ROOT, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024 },
  );
  if (result.status !== 0) {
    const reason = result.error ? result.error.message : (result.stderr || result.stdout || '').trim();
    throw new Error(`Token usage query failed: ${reason || `exit ${result.status}`}`);
  }
  return { workspace: ws.directoryName, estimated: true, ...JSON.parse(result.stdout) };
}

// --- Generic parallel runner ---

const parallelRuns = new Map();

function launchGenericParallel({ ws, args }) {
  const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const normalizedArgs = {
    ...args,
    taskIds: args.taskIds ? ensureStringArray(args.taskIds, 'taskIds', true) : undefined,
    runId,
  };
  const pyArgs = buildRunnerArgs(ws, normalizedArgs);

  const logsDir = path.join(ws.historyRoot, runId);
  fs.mkdirSync(logsDir, { recursive: true });
  const orchestratorLog = path.join(logsDir, 'orchestrator.log');
  const logStream = fs.createWriteStream(orchestratorLog, { flags: 'w' });

  const { spawn } = require('node:child_process');
  const child = spawn('python3', pyArgs, { cwd: ROOT, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });

  const agentName = args.agent || 'per-task';
  const stateFile = path.join(logsDir, 'run-state.json');
  const state = { runId, workspace: ws.directoryName, agent: agentName, pid: child.pid, status: 'running', startedAt: new Date().toISOString(), finishedAt: null, exitCode: null, lastLines: [], logsDir, stateFile };
  parallelRuns.set(runId, state);
  persistParallelRun(state);

  child.stdout.on('data', (chunk) => {
    logStream.write(chunk);
    const lines = chunk.toString().split('\n').filter(Boolean);
    state.lastLines = [...state.lastLines, ...lines].slice(-10);
    persistParallelRun(state, false);
  });
  child.stderr.on('data', (chunk) => {
    logStream.write(chunk);
    const lines = chunk.toString().split('\n').filter(Boolean);
    state.lastLines = [...state.lastLines, ...lines].slice(-10);
    persistParallelRun(state, false);
  });
  child.on('close', (code) => {
    logStream.end();
    state.status = code === 0 ? 'success' : 'failed';
    state.exitCode = code;
    state.finishedAt = new Date().toISOString();
    persistParallelRun(state);
  });
  child.on('error', (err) => {
    logStream.end();
    state.status = 'failed';
    state.exitCode = -1;
    state.error = err.message;
    state.finishedAt = new Date().toISOString();
    persistParallelRun(state);
  });

  return { runId, workspace: ws.directoryName, agent: agentName, pid: child.pid, logsDir, message: `Runner started (agent: ${agentName}). Monitor with parallel_status(runId="${runId}").` };
}

function persistParallelRun(state, force = true) {
  const now = Date.now();
  if (!force && state._lastPersistedAt && now - state._lastPersistedAt < 1000) return;
  state._lastPersistedAt = now;
  const serializable = { ...state };
  delete serializable.stateFile;
  delete serializable._lastPersistedAt;
  writeFileAtomic(state.stateFile, `${JSON.stringify(serializable, null, 2)}\n`);
}

function loadPersistedParallelRun(runId) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(ensureString(runId, 'runId'))) {
    throw new Error('Field "runId" contains unsupported characters.');
  }
  for (const workspace of listWorkspaces()) {
    const stateFile = path.join(workspace.historyRoot, runId, 'run-state.json');
    if (!fs.existsSync(stateFile)) continue;
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    if (!state || typeof state !== 'object' || state.runId !== runId) {
      throw new Error(`Persisted parallel-run state is invalid: ${stateFile}`);
    }
    state.workspace = workspace.directoryName;
    state.logsDir = path.dirname(stateFile);
    state.stateFile = stateFile;
    if (state.status === 'running' && !isProcessAlive(state.pid)) {
      state.status = 'interrupted';
      state.finishedAt = state.finishedAt || new Date().toISOString();
      persistParallelRun(state);
    }
    parallelRuns.set(runId, state);
    return state;
  }
  return null;
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid < 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

function getParallelTaskDetail(run, taskId) {
  const wanted = ensureString(taskId, 'taskId');
  if (!fs.existsSync(run.logsDir)) throw new Error(`Run logs were not found: ${run.logsDir}`);
  for (const entry of fs.readdirSync(run.logsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const stageDir = path.join(run.logsDir, entry.name);
    const summaryPath = path.join(stageDir, 'summary.json');
    const metadataPath = path.join(stageDir, 'metadata.json');
    const dataPath = fs.existsSync(summaryPath) ? summaryPath : metadataPath;
    if (!fs.existsSync(dataPath)) continue;
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const taskIds = (data.tasks || []).map((task) => task.id);
    if (!taskIds.includes(wanted)) continue;
    const logPath = path.join(stageDir, 'agent.log');
    return {
      ...data,
      stageDir,
      tailLog: fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8').split('\n').slice(-20).join('\n') : '',
    };
  }
  throw new Error(`Task "${wanted}" was not found in parallel run "${run.runId}".`);
}

function listPersistedParallelRuns() {
  const results = new Map(parallelRuns);
  for (const workspace of listWorkspaces()) {
    const runsDir = workspace.historyRoot;
    if (!fs.existsSync(runsDir)) continue;
    for (const runEntry of fs.readdirSync(runsDir, { withFileTypes: true })) {
      if (!runEntry.isDirectory() || results.has(runEntry.name)) continue;
      try {
        const state = loadPersistedParallelRun(runEntry.name);
        if (state) results.set(state.runId, state);
      } catch (error) {
        results.set(`${workspace.directoryName}/${runEntry.name}`, {
          runId: runEntry.name,
          workspace: workspace.directoryName,
          status: 'invalid',
          error: error.message,
          startedAt: null,
          finishedAt: null,
        });
      }
    }
  }
  return [...results.values()];
}

// --- Tool call dispatch ---

function callTool(name, args = {}) {
  // Normalize: accept both "workspace" and "ws" in args for all tools
  if (args.ws && !args.workspace) args.workspace = args.ws;

  switch (name) {
    case 'get_operating_context': return getOperatingContext(args);
    case 'list_workspaces': return { workspaces: listWorkspaces() };
    case 'create_workspace': return createWorkspace(args);
    case 'list_tasks': {
      const ws = getWorkspace(resolveWsArg(args));
      return { workspace: ws.directoryName, tasks: listTasks(ws, args).map(summarizeTask) };
    }
    case 'get_task': {
      const ws = getWorkspace(resolveWsArg(args));
      const task = resolveTask(ws, args.task);
      const contextBudgetTokens = args.contextBudgetTokens === undefined
        ? ws.tokenPolicy.contextBudgetTokens
        : ensurePositiveInteger(args.contextBudgetTokens, 'contextBudgetTokens', 32000);
      const context = loadTaskContext(task, { workspace: ws, maxTokens: contextBudgetTokens });
      rememberActiveTasks(ws.directoryName, [task.id], 'loaded-by-mcp');
      return { workspace: ws.directoryName, task, ...(context.hasContext ? { executionContext: context.content, contextManifest: context.manifest, ...(context.cacheError ? { contextCacheWarning: context.cacheError } : {}) } : {}) };
    }
    case 'get_task_diff': return getTaskDiff(args, getWorkspace);
    case 'get_token_usage': return getTokenUsage(getWorkspace(resolveWsArg(args)));
    case 'compact_task_context': return compactTaskContext(args, getWorkspace);
    case 'get_active_tasks': {
      const ws = getWorkspace(resolveWsArg(args));
      return { workspace: ws.directoryName, activeTasks: getActiveTasks(ws.directoryName) };
    }
    case 'remember_active_tasks': {
      const ws = getWorkspace(resolveWsArg(args));
      const taskIds = ensureStringArray(args.tasks, 'tasks', true);
      const resolved = taskIds.map((id) => resolveTask(ws, id));
      rememberActiveTasks(ws.directoryName, resolved.map((t) => t.id), args.reason || 'remembered-by-agent');
      return { workspace: ws.directoryName, activeTasks: getActiveTasks(ws.directoryName) };
    }
    case 'create_task': return createTask(args, getWorkspace);
    case 'set_task_status': return setTaskStatus(args, getWorkspace);
    case 'set_task_board_status': return setTaskBoardStatus(args, getWorkspace);
    case 'start_task_execution': return startTaskExecution(args, getWorkspace);
    case 'finish_task_execution': return finishTaskExecution(args, getWorkspace);
    case 'run_with_runner': return runWithRunner(args, getWorkspace);
    case 'run_parallel': {
      if (args.userConfirmedRunner !== true) throw new Error('Parallel execution requires userConfirmedRunner: true.');
      if (args.concurrency !== undefined) args.concurrency = ensurePositiveInteger(args.concurrency, 'concurrency', MAX_CONCURRENCY);
      const ws = getWorkspace(resolveWsArg(args));
      return launchGenericParallel({ ws, args });
    }
    case 'parallel_status': {
      const run = parallelRuns.get(args.runId) || loadPersistedParallelRun(args.runId);
      if (!run) throw new Error(`Parallel run "${args.runId}" was not found in memory or persisted workspace history.`);
      if (args.taskId) return getParallelTaskDetail(run, args.taskId);
      const result = { ...run };
      delete result.stateFile;
      const logPath = path.join(run.logsDir, 'orchestrator.log');
      if (fs.existsSync(logPath)) {
        const content = fs.readFileSync(logPath, 'utf8');
        result.tailLog = content.split('\n').slice(-20).join('\n');
      }
      return result;
    }
    case 'list_parallel_runs': {
      return listPersistedParallelRuns().map((r) => ({
        runId: r.runId,
        workspace: r.workspace,
        agent: r.agent,
        status: r.status,
        pid: r.pid,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        ...(r.error ? { error: r.error } : {}),
      }));
    }
    case 'get_my_activity': {
      const ws = getWorkspace(resolveWsArg(args));
      if (!ws.githubProject) throw new Error(`Workspace "${ws.directoryName}" does not have githubProject configured.`);
      const result = getMyActivity(ws.githubProject, { since: args.since, until: args.until });
      return formatActivity(result);
    }
    case 'create_github_project': {
      const ws = getWorkspace(resolveWsArg(args));
      if (ws.githubProject) throw new Error(`Workspace "${ws.directoryName}" already has githubProject configured: ${ws.githubProject.url}`);
      return createGitHubProject({ ws, title: ensureString(args.title, 'title') });
    }
    case 'reconcile_workspace': {
      const ws = getWorkspace(resolveWsArg(args));
      return reconcile(ws, { dryRun: args.dryRun !== false, direction: args.direction || 'both' });
    }
    default: throw new Error(`Unknown tool: ${name}`);
  }
}

// --- MCP server ---

async function handleMessage(message) {
  if (message.method === 'initialize') {
    return jsonResult(message.id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'ws-runner', version: '0.2.0' },
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
