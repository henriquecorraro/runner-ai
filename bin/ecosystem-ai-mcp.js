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
  loadTaskContext,
} = require('../lib/tasks');
const { runWithRunner } = require('../lib/runner');
const { launchParallel, getParallelStatus, listParallelRuns, MAX_CONCURRENCY } = require('../lib/parallel-runner');
const { getMyActivity } = require('../lib/github-activity');
const { createGitHubProject } = require('../lib/github-project-create');
const { reconcile } = require('../lib/reconcile');

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
    description: 'Return the ws-runner operating rules. Use this before planning or executing workspace tasks.',
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
    description: 'Create a centralized task file. Deterministic GitHub sync is all-or-fail: when githubProject is configured, preflight every linked repository, create GitHub issues in all linked repositories, assign every issue to the authenticated user, add the primary issue to the Project, and move it to Todo before recording the local task. Titles and body must be in English. Body must be terse machine-readable specs for AI agent execution: declarative, structured, zero prose. Follow taskWritingRules from get_operating_context. The intent field is optional human-readable context (the WHY behind the task) that appears only on the GitHub card, never in the local task file.',
    inputSchema: {
      type: 'object', required: ['workspace', 'title', 'repositories', 'body'],
      properties: { workspace: { type: 'string' }, id: { type: 'string' }, title: { type: 'string' }, scope: { type: 'string' }, repositories: { type: 'array', items: { type: 'string' } }, validation: { type: 'array', items: { type: 'string' } }, docsTargets: { type: 'array', items: { type: 'string' } }, dependsOn: { type: 'array', items: { type: 'string' } }, body: { type: 'string' }, intent: { type: 'string', description: 'Human-readable context for the GitHub card: the WHY behind this task, how the decision was reached, the conversation summary. Goes only to the card, never to the local task file.' }, context: { type: 'string', description: 'Pre-computed execution context snapshot for the executor agent. Include: relevant file contents, type signatures, current state of components, architectural decisions, and pitfalls discussed. Saved as .context.md sibling file. The executor loads this automatically via get_task instead of re-reading the codebase from scratch — saves tokens and execution time.' } },
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
    description: 'Deterministically start current-chat execution for one task. Creates a feature branch (feat/<scope>) in all affected repositories, checks out baseBranch, pulls latest, then creates the branch. Moves the GitHub Project item to In Progress.',
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
    name: 'run_with_runner',
    description: 'Run the isolated workspace runner. Use only after explicit user choice; dryRun defaults to true. Non-dry-run execution moves every selected task to In Progress before execution and to Testing after successful execution.',
    inputSchema: {
      type: 'object', required: ['workspace', 'selection', 'userConfirmedRunner'],
      properties: { workspace: { type: 'string' }, selection: { type: 'string', enum: ['task', 'scope', 'feature', 'open-tasks', 'open-scopes'] }, value: { type: 'string' }, agent: { type: 'string' }, dryRun: { type: 'boolean' }, userConfirmedRunner: { type: 'boolean' } },
    },
  },
  {
    name: 'run_parallel',
    description: `Launch workspace tasks in parallel (up to ${MAX_CONCURRENCY} physical cores) using the Python async runner. The agent command is read from the workspace config — works with any agent (kiro, codex, claude, etc). Each task runs in its own process, moves its GitHub Project card to In Progress when the worker starts, and moves it to Testing after successful completion. Returns a runId to monitor progress.`,
    inputSchema: {
      type: 'object', required: ['workspace', 'userConfirmedRunner'],
      properties: {
        workspace: { type: 'string' },
        taskIds: { type: 'array', items: { type: 'string' }, description: 'Task IDs to execute. If omitted, use scope or openTasks.' },
        scope: { type: 'string', description: 'Run all actionable tasks in this scope.' },
        openTasks: { type: 'boolean', description: 'Run all open/needs-rework tasks.' },
        agent: { type: 'string', description: 'Agent name override (must exist in workspace agents config). Default: workspace defaultAgent.' },
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
  {
    name: 'reconcile_workspace',
    description: 'Lightweight bidirectional reconcile between local task files and their GitHub Project cards. Detects drift (status mismatch, externally closed issues, stale frontmatter) and optionally fixes it. Use dryRun: true (default) to preview, dryRun: false to fix.',
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
      'When creating tasks, always generate an intent field: a human-readable summary of WHY this task exists, the reasoning process, and how the decision was reached in the conversation. The intent goes only to the GitHub card — the local task file stays machine-readable with zero prose.',
      'When creating tasks, always generate a context field: a pre-computed knowledge snapshot that the executor agent will need. Include relevant file contents read during planning, type signatures, current component state, architectural constraints, and pitfalls discussed. This is saved as a .context.md sibling file and loaded automatically by get_task — it prevents the executor from wasting tokens re-reading the same files.',
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

const parallelRuns = new Map();

function launchGenericParallel({ ws, args }) {
  const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

  if (args.agent) pyArgs.push('--agent', ensureString(args.agent, 'agent'));
  if (args.concurrency) pyArgs.push('--concurrency', String(args.concurrency));

  const logsDir = path.join(ROOT, 'workspaces', ws.directoryName, 'runs', runId);
  fs.mkdirSync(logsDir, { recursive: true });
  const orchestratorLog = path.join(logsDir, 'orchestrator.log');
  const logStream = fs.createWriteStream(orchestratorLog, { flags: 'w' });

  const { spawn } = require('node:child_process');
  const child = spawn('python3', pyArgs, { cwd: ROOT, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });

  const agentName = args.agent || ws.defaultAgent || 'default';
  const state = { runId, workspace: ws.directoryName, agent: agentName, pid: child.pid, status: 'running', startedAt: new Date().toISOString(), finishedAt: null, exitCode: null, lastLines: [], logsDir };
  parallelRuns.set(runId, state);

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

  return { runId, workspace: ws.directoryName, agent: agentName, pid: child.pid, logsDir, message: `Runner started (agent: ${agentName}). Monitor with parallel_status(runId="${runId}").` };
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
      const context = loadTaskContext(task);
      rememberActiveTasks(ws.directoryName, [task.id], 'loaded-by-mcp');
      return { workspace: ws.directoryName, task, ...(context.hasContext ? { executionContext: context.content } : {}) };
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
    case 'run_with_runner': return runWithRunner(args, getWorkspace);
    case 'run_parallel': {
      if (args.userConfirmedRunner !== true) throw new Error('Parallel execution requires userConfirmedRunner: true.');
      const ws = getWorkspace(resolveWsArg(args));
      return launchGenericParallel({ ws, args });
    }
    case 'parallel_status': {
      const run = parallelRuns.get(args.runId);
      if (!run) {
        // Try Node parallel runner (legacy)
        return getParallelStatus(args.runId, args.taskId);
      }
      const result = { ...run };
      const logPath = path.join(run.logsDir, 'orchestrator.log');
      if (fs.existsSync(logPath)) {
        const content = fs.readFileSync(logPath, 'utf8');
        result.tailLog = content.split('\n').slice(-20).join('\n');
      }
      return result;
    }
    case 'list_parallel_runs': {
      const nodeRuns = listParallelRuns();
      const pyRuns = [...parallelRuns.values()].map((r) => ({ runId: r.runId, workspace: r.workspace, agent: r.agent, status: r.status, pid: r.pid, startedAt: r.startedAt }));
      return [...nodeRuns.map((r) => ({ ...r, type: 'legacy-node' })), ...pyRuns];
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
