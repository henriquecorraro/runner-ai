#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const { ensureString, ensureStringArray } = require('../lib/utils');
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
  createScopeBranch,
} = require('../lib/tasks');
const { runWithRunner } = require('../lib/runner');
const { launchParallel, getParallelStatus, listParallelRuns, MAX_CONCURRENCY } = require('../lib/parallel-runner');
const { getMyActivity } = require('../lib/github-activity');
const { createGitHubProject } = require('../lib/github-project-create');

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
    description: 'Return the workspace-ai-runner operating rules. Use this before planning or executing workspace tasks.',
    inputSchema: { type: 'object', properties: { workspace: { type: 'string', description: 'Optional workspace name.' } } },
  },
  {
    name: 'list_workspaces',
    description: 'List configured workspaces and their repositories.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'create_workspace',
    description: 'Create a centralized workspace directory deterministically. If githubProject.url is not known, ask the user for it before calling this tool, unless the user explicitly says no Project is needed; in that case pass skipGithubProject: true.',
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
    description: 'Load one task for execution in the current chat/agent.',
    inputSchema: { type: 'object', required: ['workspace', 'task'], properties: { workspace: { type: 'string' }, task: { type: 'string', description: 'Task id, filename, or unique fragment.' } } },
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
    description: 'Create a centralized task file. Deterministic GitHub sync is all-or-fail: when githubProject is configured, preflight every linked repository, create GitHub issues in all linked repositories, assign every issue to the authenticated user, add the primary issue to the Project, and move it to Todo before recording the local task. Titles and body must be in English. Body must be terse machine-readable specs for AI agent execution: declarative, structured, zero prose. Follow taskWritingRules from get_operating_context.',
    inputSchema: {
      type: 'object', required: ['workspace', 'title', 'repositories', 'body'],
      properties: { workspace: { type: 'string' }, id: { type: 'string' }, title: { type: 'string' }, scope: { type: 'string' }, repositories: { type: 'array', items: { type: 'string' } }, validation: { type: 'array', items: { type: 'string' } }, docsTargets: { type: 'array', items: { type: 'string' } }, dependsOn: { type: 'array', items: { type: 'string' } }, body: { type: 'string' } },
    },
  },
  {
    name: 'set_task_status',
    description: 'Update a task status. Setting implemented moves the GitHub Project item to Testing before recording the local status. Requires userValidated: true for done; done updates the GitHub issue closeout section and moves the Project item to Done.',
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
          description: 'Required when status is done. The agent must ask whether to skip PR handoff, use the current branch, or create a new branch before closing.',
          required: ['decision'],
          properties: {
            decision: { type: 'string', enum: ['skip', 'current-branch', 'new-branch'] },
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
    description: 'Move one task GitHub Project card to Todo, In Progress, Testing, or Done. Use this for current-chat execution lifecycle when not using run_with_runner.',
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
    description: 'Deterministically start current-chat execution for one task by moving its GitHub Project item to In Progress before any implementation work.',
    inputSchema: {
      type: 'object',
      required: ['workspace', 'task'],
      properties: {
        workspace: { type: 'string' },
        task: { type: 'string', description: 'Task id, filename, or unique fragment.' },
      },
    },
  },
  {
    name: 'finish_task_execution',
    description: 'Deterministically finish current-chat implementation for one task. By default triggers a review loop: returns the task spec + git diff for comparison without moving to Testing. The agent must review, fix issues, and call again. Only moves to Testing when skipReview: true is passed after user confirmation.',
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
    name: 'create_scope_branch',
    description: 'Create a git branch in all repositories affected by a scope or set of tasks. Checks out baseBranch (default: main), pulls latest, then creates the new branch. Use before starting task execution to isolate work.',
    inputSchema: {
      type: 'object',
      required: ['workspace'],
      properties: {
        workspace: { type: 'string' },
        scope: { type: 'string', description: 'Create branch for all repos affected by this scope.' },
        taskIds: { type: 'array', items: { type: 'string' }, description: 'Alternative: resolve repos from specific task IDs.' },
        branchName: { type: 'string', description: 'Explicit branch name. Default: feat/<scope-slug>.' },
        baseBranch: { type: 'string', description: 'Base branch to create from. Default: main.' },
      },
    },
  },
  {
    name: 'run_with_runner',
    description: 'Run the isolated workspace runner. Use only after explicit user choice; dryRun defaults to true. Non-dry-run execution moves every selected task to In Progress before execution and to Testing after successful execution.',
    inputSchema: {
      type: 'object', required: ['workspace', 'selection', 'userConfirmedRunner'],
      properties: { workspace: { type: 'string' }, selection: { type: 'string', enum: ['task', 'scope', 'feature', 'open-tasks', 'open-scopes'] }, value: { type: 'string' }, agent: { type: 'string' }, dryRun: { type: 'boolean' }, userConfirmedRunner: { type: 'boolean' } },
    },
  },
  {
    name: 'run_parallel',
    description: `Launch workspace tasks in parallel (up to ${MAX_CONCURRENCY} physical cores). Each task runs in its own process/core, moves its GitHub Project card to In Progress when the worker starts, and moves it to Testing after successful completion. Returns a runId to monitor progress.`,
    inputSchema: {
      type: 'object', required: ['workspace', 'taskIds', 'userConfirmedRunner'],
      properties: {
        workspace: { type: 'string' },
        taskIds: { type: 'array', items: { type: 'string' }, description: 'Task IDs to execute in parallel.' },
        agent: { type: 'string', description: 'Agent name (default: workspace default).' },
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
    description: `Launch workspace tasks in parallel using kiro-cli agents (up to ${MAX_CONCURRENCY} cores). Each task runs in its own kiro-cli process. Use when user asks to run tasks with kiro runner. Returns a runId to monitor with parallel_status.`,
    inputSchema: {
      type: 'object', required: ['workspace', 'userConfirmedRunner'],
      properties: {
        workspace: { type: 'string' },
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
    description: 'Create a GitHub Project v2 for a workspace that does not have one. Creates the project with a Status single-select field (Todo, In Progress, Testing, Done) and updates workspace.config.json.',
    inputSchema: {
      type: 'object', required: ['workspace', 'title'],
      properties: {
        workspace: { type: 'string' },
        title: { type: 'string', description: 'Title for the new GitHub Project.' },
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

  return {
    repositoryRoot: ROOT,
    currentChatDefault: true,
    runnerRequiresExplicitUserChoice: true,
    contextualTaskReferencesUseCurrentConversationFirst: true,
    guidance: [
      'ENGLISH FIRST for workspace SDD artifacts.',
      'Use create_workspace for deterministic workspace creation.',
      'Before create_workspace, ask for a GitHub Project URL unless the user explicitly confirms no Project is needed; then pass skipGithubProject: true.',
      'When creating tasks in a workspace with githubProject, create_task is all-or-fail: it preflights every linked repository, creates GitHub issues in every linked repository, assigns every issue to the authenticated user, adds the primary issue to the Project in Todo, and only then records the local task.',
      'For current-chat execution, use start_task_execution before implementation and finish_task_execution after implementation; these are required lifecycle gates.',
      'finish_task_execution has a built-in review loop: without skipReview, it returns the task spec + git diff. The agent must compare spec vs implementation, fix bugs, and call finish again. Only pass skipReview: true after the review is clean AND the user confirms.',
      'For run_with_runner and run_parallel, every selected task card moves to In Progress before execution and Testing when that task succeeds.',
      'When the user validates and asks to document/close a task, ask whether to skip PR handoff, use the current branch, or create a new branch; then use set_task_status(status="done", userValidated=true) with prHandoff, closeoutSummary, and PR URLs so the GitHub issue is updated and the Project item is moved to Done.',
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
    workspace: ws,
    activeTasks: ws ? getActiveTasks(ws.directoryName) : [],
  };
}

// --- Kiro parallel runner ---

const kiroRuns = new Map();

function launchKiroParallel(args) {
  if (args.userConfirmedRunner !== true) throw new Error('Kiro runner requires userConfirmedRunner: true.');
  const ws = getWorkspace(resolveWsArg(args));

  const runId = `kiro-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const pyArgs = ['-m', 'runners.kiro', '--config', ws.configPath, '--run-id', runId, '--no-tui'];

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

  const logsDir = path.join(ROOT, 'workspaces', ws.directoryName, 'runs', runId);
  fs.mkdirSync(logsDir, { recursive: true });
  const orchestratorLog = path.join(logsDir, 'orchestrator.log');
  const logStream = fs.createWriteStream(orchestratorLog, { flags: 'w' });

  const { spawn } = require('node:child_process');
  const child = spawn('python3', pyArgs, { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });

  const state = { runId, workspace: ws.directoryName, pid: child.pid, status: 'running', startedAt: new Date().toISOString(), finishedAt: null, exitCode: null, lastLines: [], logsDir };
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

  return { runId, workspace: ws.directoryName, pid: child.pid, logsDir, message: `Kiro runner started. Monitor with parallel_status(runId="${runId}") or check ${logsDir}` };
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
      rememberActiveTasks(ws.directoryName, [task.id], 'loaded-by-mcp');
      return { workspace: ws.directoryName, task };
    }
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
    case 'create_scope_branch': return createScopeBranch(args, getWorkspace);
    case 'run_with_runner': return runWithRunner(args, getWorkspace);
    case 'run_parallel': {
      if (args.userConfirmedRunner !== true) throw new Error('Parallel execution requires userConfirmedRunner: true.');
      const ws = getWorkspace(resolveWsArg(args));
      const taskIds = ensureStringArray(args.taskIds, 'taskIds', true);
      return launchParallel({ ws, taskIds, agent: args.agent, concurrency: args.concurrency });
    }
    case 'parallel_status': {
      if (kiroRuns.has(args.runId)) {
        const kr = kiroRuns.get(args.runId);
        const result = { ...kr };
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
      const kiro = [...kiroRuns.values()].map((r) => ({ runId: r.runId, workspace: r.workspace, type: 'kiro', status: r.status, pid: r.pid, startedAt: r.startedAt }));
      return [...codexRuns.map((r) => ({ ...r, type: 'codex' })), ...kiro];
    }
    case 'run_kiro_parallel': return launchKiroParallel(args);
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
    default: throw new Error(`Unknown tool: ${name}`);
  }
}

// --- MCP server ---

async function handleMessage(message) {
  if (message.method === 'initialize') {
    return jsonResult(message.id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'workspace-ai-runner', version: '0.3.0' },
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
