'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { slugify, normalizeSearchValue, ensureString, ensureStringArray, ensurePositiveInteger, escapeRegExp } = require('./utils');
const { parseTaskFile, buildTaskMarkdown, writeFileAtomic } = require('./frontmatter');
const { estimateTokens, truncateToTokenBudget, pageByTokenBudget, contentHash } = require('./token-usage');
const { MANIFEST_MARKER, assembleTaskContext, fallbackContext } = require('./context-cache');
const {
  BOARD_STATUS,
  createTaskCard,
  moveTaskCard,
  updateTaskCardCloseout,
  rollbackCreatedTaskCard,
} = require('./github-sync');

const VALID_TASK_STATUSES = new Set(['open', 'implemented', 'needs-rework', 'done']);
const TASK_ROUTING_VALUES = {
  complexity: new Set(['low', 'medium', 'high']),
  risk: new Set(['low', 'medium', 'critical']),
  executionProfile: new Set(['mechanical', 'standard', 'deep']),
  routingPolicy: new Set(['pinned', 'preferred', 'portable']),
  reasoningEffort: new Set(['low', 'medium', 'high', 'xhigh']),
};

function optionalRoutingValue(value, fieldName) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const resolved = ensureString(value, fieldName).toLowerCase();
  if (!TASK_ROUTING_VALUES[fieldName].has(resolved)) {
    throw new Error(`Field "${fieldName}" must be one of: ${[...TASK_ROUTING_VALUES[fieldName]].join(', ')}.`);
  }
  return resolved;
}

// --- State machine: allowed transitions ---
const ALLOWED_TRANSITIONS = {
  open: new Set(['implemented', 'needs-rework']),
  'needs-rework': new Set(['implemented', 'open']),
  implemented: new Set(['done', 'needs-rework']),
  done: new Set([]),
};

function validateTransition(task, toStatus) {
  const fromStatus = task.status;
  const allowed = ALLOWED_TRANSITIONS[fromStatus];
  if (!allowed || !allowed.has(toStatus)) {
    throw new Error(`Invalid status transition for task "${task.id}": ${fromStatus} → ${toStatus}. Allowed from "${fromStatus}": ${allowed ? [...allowed].join(', ') : 'none'}.`);
  }
}

// --- Active tasks persistence ---
const activeTasksByWorkspace = new Map();

function activeSessionPath(workspaceName) {
  const { ROOT } = require('./workspaces');
  const { resolveContainedPath } = require('./utils');
  const workspaceDir = resolveContainedPath(path.join(ROOT, 'workspaces'), workspaceName, 'workspaceName');
  const configPath = path.join(workspaceDir, 'workspace.config.json');
  let historyRoot = path.join(workspaceDir, 'runs');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    historyRoot = resolveContainedPath(workspaceDir, config.historyRoot || 'runs', 'historyRoot');
  }
  return path.join(historyRoot, '.active-session.json');
}

function loadActiveSession(workspaceName) {
  if (activeTasksByWorkspace.has(workspaceName)) return;
  const sessionFile = activeSessionPath(workspaceName);
  if (fs.existsSync(sessionFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
      if (!Array.isArray(data)) throw new Error('expected a JSON array');
      activeTasksByWorkspace.set(workspaceName, data);
    } catch (error) {
      throw new Error(`Active-task session is corrupted (${sessionFile}): ${error.message}`);
    }
  }
}

function persistActiveSession(workspaceName) {
  const current = activeTasksByWorkspace.get(workspaceName) || [];
  const sessionFile = activeSessionPath(workspaceName);
  const dir = path.dirname(sessionFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  writeFileAtomic(sessionFile, JSON.stringify(current, null, 2) + '\n');
}

function rememberActiveTasks(workspaceName, taskIds, reason) {
  loadActiveSession(workspaceName);
  const current = activeTasksByWorkspace.get(workspaceName) || [];
  const seen = new Set(current.map((i) => i.id));
  const timestamp = new Date().toISOString();
  for (const taskId of taskIds) {
    if (!seen.has(taskId)) {
      current.push({ id: taskId, reason, rememberedAt: timestamp });
      seen.add(taskId);
    }
  }
  activeTasksByWorkspace.set(workspaceName, current);
  persistActiveSession(workspaceName);
}

function getActiveTasks(workspaceName) {
  loadActiveSession(workspaceName);
  return activeTasksByWorkspace.get(workspaceName) || [];
}

function listTasks(ws, filters = {}) {
  if (!fs.existsSync(ws.tasksDir)) return [];

  let tasks = fs
    .readdirSync(ws.tasksDir)
    .filter((f) => f.endsWith('.md') && !f.endsWith('.context.md'))
    .sort()
    .map((f) => parseTaskFile(path.join(ws.tasksDir, f)));

  const seenTaskIds = new Set();
  const knownRepositories = Array.isArray(ws.repositories) ? new Set(ws.repositories.map((repo) => repo.id)) : null;
  for (const task of tasks) {
    const normalizedId = normalizeSearchValue(task.id);
    if (seenTaskIds.has(normalizedId)) throw new Error(`Duplicate task id "${task.id}" in ${ws.tasksDir}.`);
    seenTaskIds.add(normalizedId);
    if (new Set(task.repositories).size !== task.repositories.length) {
      throw new Error(`Task "${task.id}" contains duplicate repository ids.`);
    }
    if (knownRepositories) {
      const unknownRepositories = task.repositories.filter((repository) => !knownRepositories.has(repository));
      if (unknownRepositories.length) throw new Error(`Task "${task.id}" references unknown repositories: ${unknownRepositories.join(', ')}`);
    }
  }

  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status.map(String) : [String(filters.status)];
    tasks = tasks.filter((t) => statuses.includes(t.status));
  }
  if (filters.scope) {
    tasks = tasks.filter((t) => t.scope === filters.scope);
  }
  return tasks;
}

function getTaskFileNumber(fileName) {
  const match = fileName.match(/^(\d+)-/);
  return match ? Number(match[1]) : null;
}

function getNextTaskFileNumber(ws) {
  const tasks = listTasks(ws);
  const numbers = tasks.map((t) => getTaskFileNumber(t.fileName)).filter(Number.isInteger);
  return numbers.length ? Math.max(...numbers) + 1 : tasks.length + 1;
}

function buildTaskFileName(ws, id) {
  const number = String(getNextTaskFileNumber(ws)).padStart(2, '0');
  return `${number}-${id.replace(/^\d+-/, '')}.md`;
}

function withTaskCreationLock(ws, callback, mayReclaimStaleLock = true) {
  const lockPath = path.join(ws.tasksDir, '.create-task.lock');
  let lockFd;
  try {
    lockFd = fs.openSync(lockPath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY);
    fs.writeFileSync(lockFd, JSON.stringify({ pid: process.pid, hostname: os.hostname(), createdAt: new Date().toISOString() }));
    fs.fsyncSync(lockFd);
  } catch (error) {
    if (error.code === 'EEXIST') {
      if (mayReclaimStaleLock && reclaimStaleTaskLock(lockPath)) {
        return withTaskCreationLock(ws, callback, false);
      }
      throw new Error(`Another task creation is already in progress for workspace "${ws.directoryName}" (${lockPath}).`);
    }
    if (lockFd !== undefined) {
      try { fs.closeSync(lockFd); } catch { /* preserve original error */ }
      try { fs.unlinkSync(lockPath); } catch { /* preserve original error */ }
    }
    throw error;
  }

  try {
    return callback();
  } finally {
    if (lockFd !== undefined) fs.closeSync(lockFd);
    try { fs.unlinkSync(lockPath); } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

function reclaimStaleTaskLock(lockPath) {
  try {
    const owner = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    if (owner.hostname !== os.hostname() || !Number.isInteger(owner.pid) || owner.pid < 1) return false;
    try {
      process.kill(owner.pid, 0);
      return false;
    } catch (error) {
      if (error.code !== 'ESRCH') return false;
    }
    fs.unlinkSync(lockPath);
    return true;
  } catch {
    try {
      const ageMs = Date.now() - fs.statSync(lockPath).mtimeMs;
      if (ageMs > 60000) {
        fs.unlinkSync(lockPath);
        return true;
      }
    } catch { /* lock is still active or cannot be inspected safely */ }
    return false;
  }
}

function resolveTask(ws, reference) {
  const wanted = ensureString(reference, 'task');
  const normalized = normalizeSearchValue(wanted);
  const tasks = listTasks(ws);

  const exact = tasks.find(
    (t) =>
      t.id === wanted ||
      t.fileName === wanted ||
      normalizeSearchValue(t.id) === normalized ||
      normalizeSearchValue(t.fileName) === normalized,
  );
  if (exact) return exact;

  const matches = tasks.filter(
    (t) => normalizeSearchValue(t.id).includes(normalized) || normalizeSearchValue(t.fileName).includes(normalized),
  );
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) throw new Error(`Task reference "${wanted}" matched multiple tasks: ${matches.map((t) => t.id).join(', ')}`);
  throw new Error(`Task "${wanted}" was not found in workspace "${ws.directoryName}".`);
}

function summarizeTask(task) {
  const { body, ...summary } = task;
  return summary;
}

function buildTaskStatusEntry(status, task, number) {
  if (number) return `${number}. \`${status}\` \`${task.id}\`\n${' '.repeat(String(number).length + 2)}${task.title}`;
  return `- \`${status}\` \`${task.id}\`\n  ${task.title}`;
}

function updateTaskStatusInReadme(ws, task, status) {
  const readmePath = path.join(ws.sddRoot, 'README.md');
  if (!fs.existsSync(readmePath)) return { updated: false, reason: 'README.md not found' };

  const content = fs.readFileSync(readmePath, 'utf8');
  const knownStatuses = [...VALID_TASK_STATUSES].map(escapeRegExp).join('|');
  const statusLinePattern = new RegExp(`((?:-|\\d+\\.)\\s+\`)(?:${knownStatuses})(\`\\s+\`${escapeRegExp(task.id)}\`)`);

  if (statusLinePattern.test(content)) {
    writeFileAtomic(readmePath, content.replace(statusLinePattern, `$1${status}$2`));
    return { updated: true, path: readmePath };
  }

  const header = '## Task Status\n';
  const headerIndex = content.indexOf(header);
  if (headerIndex === -1) return { updated: false, reason: 'Task Status section not found' };

  const sectionStart = headerIndex + header.length;
  const nextSectionMatch = content.slice(sectionStart).match(/\n##\s/);
  const sectionEnd = nextSectionMatch ? sectionStart + nextSectionMatch.index : content.length;
  const sectionBody = content.slice(sectionStart, sectionEnd);
  const normalizedBody = sectionBody.replace(/^\s*-\s+No tasks yet\s*$/m, '').trim();
  const numberedMatches = [...sectionBody.matchAll(/^(\d+)\.\s+`/gm)];
  const nextNumber = numberedMatches.length ? Math.max(...numberedMatches.map((m) => Number(m[1]))) + 1 : null;
  const entry = buildTaskStatusEntry(status, task, nextNumber);
  const updatedBody = normalizedBody ? `\n${normalizedBody}\n\n${entry}\n` : `\n${entry}\n`;

  writeFileAtomic(readmePath, `${content.slice(0, sectionStart)}${updatedBody}${content.slice(sectionEnd)}`);
  return { updated: true, path: readmePath };
}

function createTask(args, getWorkspace, dependencies = {}) {
  const ws = getWorkspace(args.workspace);
  const title = ensureString(args.title, 'title');
  const id = slugify(args.id || title);
  const scope = slugify(args.scope || id);
  const repositories = ensureStringArray(args.repositories, 'repositories', true);
  if (new Set(repositories).size !== repositories.length) {
    throw new Error('Field "repositories" must not contain duplicate repository ids.');
  }
  const body = ensureString(args.body, 'body');
  const executionAgent = args.executionAgent || args.execution_agent
    ? ensureString(args.executionAgent || args.execution_agent, 'executionAgent') : null;
  const routingPolicy = optionalRoutingValue(args.routingPolicy || args.routing_policy || 'preferred', 'routingPolicy');
  const preferredModel = args.preferredModel || args.preferred_model
    ? ensureString(args.preferredModel || args.preferred_model, 'preferredModel') : null;
  const reasoningEffort = optionalRoutingValue(args.reasoningEffort || args.reasoning_effort, 'reasoningEffort');
  if (routingPolicy === 'pinned' && !executionAgent) {
    throw new Error('Field "executionAgent" is required when routingPolicy is "pinned".');
  }
  if (routingPolicy === 'portable' && (executionAgent || preferredModel || reasoningEffort)) {
    throw new Error('Portable routing cannot define executionAgent, preferredModel, or reasoningEffort.');
  }
  if (executionAgent && (!ws.agents || !ws.agents[executionAgent])) {
    throw new Error(`Execution agent "${executionAgent}" is not configured in workspace "${ws.directoryName}".`);
  }
  const modelAgentName = executionAgent || ws.defaultAgent;
  const modelAgent = ws.agents && ws.agents[modelAgentName];
  const configuredModels = modelAgent && Array.isArray(modelAgent.configuredModels) ? modelAgent.configuredModels : [];
  if (preferredModel && (!modelAgent || !configuredModels.includes(preferredModel))) {
    const configured = configuredModels.length ? configuredModels.join(', ') : 'none';
    throw new Error(`Model "${preferredModel}" is not configured for agent "${modelAgentName}". Configured models: ${configured}.`);
  }
  const knownRepos = new Set(ws.repositories.map((r) => r.id));
  const unknown = repositories.filter((r) => !knownRepos.has(r));
  if (unknown.length) throw new Error(`Unknown repositories: ${unknown.join(', ')}`);

  fs.mkdirSync(ws.tasksDir, { recursive: true });
  return withTaskCreationLock(ws, () => {
    const duplicate = listTasks(ws).find((task) => normalizeSearchValue(task.id) === normalizeSearchValue(id));
    if (duplicate) throw new Error(`Task id "${id}" already exists at ${duplicate.fileName}.`);

    const taskPath = path.join(ws.tasksDir, buildTaskFileName(ws, id));
    const context = args.context ? String(args.context).trim() : null;
    const contextPath = context ? taskPath.replace(/\.md$/, '.context.md') : null;
    const readmePath = path.join(ws.sddRoot, 'README.md');
    const readmeBefore = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, 'utf8') : null;
    const task = {
      id, title, scope, status: 'open', repositories,
      complexity: optionalRoutingValue(args.complexity, 'complexity'),
      risk: optionalRoutingValue(args.risk, 'risk'),
      executionProfile: optionalRoutingValue(args.executionProfile || args.execution_profile, 'executionProfile'),
      executionAgent,
      routingPolicy,
      preferredModel,
      reasoningEffort,
      validation: ensureStringArray(args.validation, 'validation'),
      docsTargets: ensureStringArray(args.docsTargets || args.docs_targets, 'docsTargets'),
      dependsOn: ensureStringArray(args.dependsOn || args.depends_on, 'dependsOn'),
      baseBranch: null,
      createdAt: new Date().toISOString(),
      finishedAt: null,
      body,
    };
    const intent = args.intent ? String(args.intent).trim() : null;
    if (intent) task.intent = intent;

    const syncTaskCard = dependencies.createTaskCard || createTaskCard;
    const rollbackTaskCard = dependencies.rollbackCreatedTaskCard || rollbackCreatedTaskCard;
    let githubSync = null;
    let taskWritten = false;
    let contextWritten = false;
    try {
      githubSync = syncTaskCard(ws, task);
      delete task.intent;

      if (githubSync.enabled) {
        task.githubIssueRepo = githubSync.primaryIssue.repo;
        task.githubIssueId = githubSync.primaryIssue.id;
        task.githubIssueNumber = githubSync.primaryIssue.number;
        task.githubIssueUrl = githubSync.primaryIssue.url;
        task.githubIssueNodeId = githubSync.primaryIssue.nodeId;
        task.githubIssueUrls = githubSync.issues.map((issue) => issue.url);
        task.githubProjectItemId = githubSync.projectItem.id;
        task.githubProjectItemNodeId = githubSync.projectItem.nodeId;
        task.githubProjectItemUrl = githubSync.projectItem.url;
        task.githubProjectStatus = githubSync.projectItem.status.name;
      }

      let fd;
      try {
        fd = fs.openSync(taskPath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY);
        fs.writeFileSync(fd, buildTaskMarkdown(task));
        fs.fsyncSync(fd);
        taskWritten = true;
      } finally {
        if (fd !== undefined) fs.closeSync(fd);
      }

      const parsedTask = parseTaskFile(taskPath);
      if (contextPath) {
        writeFileAtomic(contextPath, buildContextFile(parsedTask, context));
        contextWritten = true;
      }
      updateTaskStatusInReadme(ws, parsedTask, 'open');

      let warning = null;
      try {
        rememberActiveTasks(ws.directoryName, [parsedTask.id], 'created-by-mcp');
      } catch (error) {
        warning = `Task was created, but active-task persistence failed: ${error.message}`;
      }
      return { workspace: ws.directoryName, task: parsedTask, githubSync, contextPath, ...(warning ? { warning } : {}) };
    } catch (error) {
      const localCleanupErrors = [];
      if (contextWritten) try { fs.unlinkSync(contextPath); } catch (cleanupError) { localCleanupErrors.push(`remove context: ${cleanupError.message}`); }
      if (taskWritten || fs.existsSync(taskPath)) try { fs.unlinkSync(taskPath); } catch (cleanupError) { localCleanupErrors.push(`remove task: ${cleanupError.message}`); }
      if (readmeBefore !== null && fs.existsSync(readmePath)) {
        try { writeFileAtomic(readmePath, readmeBefore); } catch (cleanupError) { localCleanupErrors.push(`restore README: ${cleanupError.message}`); }
      }
      const rollback = githubSync ? rollbackTaskCard(ws, githubSync, error) : { attempted: false, cleanupErrors: [] };
      const cleanupErrors = [...localCleanupErrors, ...((rollback.cleanupErrors) || [])];
      const suffix = cleanupErrors.length ? ` Cleanup errors: ${cleanupErrors.join('; ')}` : '';
      throw new Error(`Task "${id}" was not created: ${error.message}.${suffix}`);
    }
  });
}

function setTaskStatus(args, getWorkspace) {
  const ws = getWorkspace(args.workspace);
  const status = ensureString(args.status, 'status').toLowerCase();
  if (!VALID_TASK_STATUSES.has(status)) throw new Error(`Unsupported status "${status}".`);
  if (status === 'done' && args.userValidated !== true) throw new Error('Refusing to mark done without userValidated: true.');
  const prHandoff = status === 'done' ? normalizePrHandoff(args.prHandoff, args.pullRequests) : null;

  const task = resolveTask(ws, args.task);

  if (task.status === status) {
    return {
      workspace: ws.directoryName,
      task,
      unchanged: true,
      readme: { updated: false, reason: `task already has status ${status}` },
      githubSync: { enabled: false, reason: `task already has status ${status}` },
    };
  }

  validateTransition(task, status);

  let githubSync = { enabled: false, reason: 'status does not require GitHub sync' };
  let createdPRs = null;

  if (status === 'implemented') {
    const board = syncBoardForStatus(ws, task, BOARD_STATUS.testing);
    githubSync = { enabled: board.enabled, board };
  } else if (status === 'done') {
    // Auto-create PRs if decision is 'create'
    if (prHandoff.decision === 'create') {
      const prResults = createPullRequests(ws, task, prHandoff.targetBranch);
      createdPRs = prResults;
      const failures = prResults.filter((result) => !result.success || !result.url);
      if (failures.length) {
        const successes = prResults.filter((result) => result.success && result.url).map((result) => `${result.repository}: ${result.url}`);
        throw new Error(`PR handoff failed: ${failures.map((result) => `${result.repository}: ${result.error || 'no PR URL returned'}`).join('; ')}.${successes.length ? ` Created before failure: ${successes.join('; ')}` : ''}`);
      }
      // Populate pullRequests from created PRs
      prHandoff.pullRequests = prResults.map((r) => ({ repository: r.repository, url: r.url }));
    }

    if (!ws.githubProject) {
      githubSync = { enabled: false, reason: 'githubProject not configured' };
    } else if (task.githubProjectItemId && (task.githubIssueNodeId || task.githubDraftIssueNodeId)) {
      const closeout = updateTaskCardCloseout(ws, task, {
        summary: args.closeoutSummary || args.comment || buildDoneSummary(task),
        pullRequests: prHandoff.pullRequests,
      });
      const board = moveTaskCard(ws, task, BOARD_STATUS.done);
      githubSync = { enabled: true, closeout, board };
    } else {
      throw new Error(`Task "${task.id}" cannot be marked done because it has no GitHub issue or Project item metadata.`);
    }
  }

  // Atomic status update via rewrite
  const updatedTask = { ...task, status };
  if (status === 'implemented') {
    updatedTask.executionState = 'testing';
    updatedTask.executionFinishedAt = updatedTask.executionFinishedAt || new Date().toISOString();
  } else if (status === 'open' || status === 'needs-rework') {
    updatedTask.executionState = null;
    updatedTask.executionRunId = null;
    updatedTask.executionBranch = null;
    updatedTask.executionStartedAt = null;
    updatedTask.executionFinishedAt = null;
  } else if (status === 'done') {
    updatedTask.finishedAt = new Date().toISOString();
    updatedTask.executionState = null;
  }
  if (githubSync.enabled && githubSync.board && githubSync.board.enabled) {
    updatedTask.githubProjectStatus = githubSync.board.status.name;
  }
  writeFileAtomic(task.filePath, buildTaskMarkdown(updatedTask));

  const parsedTask = parseTaskFile(task.filePath);
  const readme = updateTaskStatusInReadme(ws, task, status);
  rememberActiveTasks(ws.directoryName, [parsedTask.id], `status-${status}`);
  return { workspace: ws.directoryName, task: parsedTask, readme, githubSync, ...(createdPRs ? { createdPRs } : {}) };
}

function startTaskExecution(args, getWorkspace) {
  const ws = getWorkspace(args.workspace);
  const task = resolveTask(ws, args.task);
  if (!['open', 'needs-rework'].includes(task.status)) {
    throw new Error(`Task "${task.id}" is not actionable from status "${task.status}".`);
  }
  if (task.executionState === 'in-progress' || task.executionState === 'reviewing') {
    throw new Error(`Task "${task.id}" already has execution_state "${task.executionState}".`);
  }

  const branchName = args.branchName || deriveBranchName([task], task.scope);
  const baseBranch = args.baseBranch || 'main';
  const branchResults = createBranchInRepos(ws, task.repositories, branchName, baseBranch);
  let board = null;
  try {
    board = syncBoardForStatus(ws, task, BOARD_STATUS.inProgress);
    const updatedTask = {
      ...task,
      baseBranch,
      executionState: 'in-progress',
      executionRunId: args.runId || `chat-${Date.now()}`,
      executionBranch: branchName,
      executionStartedAt: new Date().toISOString(),
      executionFinishedAt: null,
      ...(board.enabled ? { githubProjectStatus: board.status.name } : {}),
    };
    writeFileAtomic(task.filePath, buildTaskMarkdown(updatedTask));
  } catch (error) {
    const compensationErrors = rollbackBranches(branchResults, branchName);
    if (board && board.enabled && task.githubProjectStatus) {
      try { moveTaskCard(ws, task, task.githubProjectStatus); } catch (compensationError) {
        compensationErrors.push(`restore board status: ${compensationError.message}`);
      }
    }
    const suffix = compensationErrors.length ? ` Compensation errors: ${compensationErrors.join('; ')}` : '';
    throw new Error(`${error.message}.${suffix}`);
  }
  const updatedTask = parseTaskFile(task.filePath);
  rememberActiveTasks(ws.directoryName, [updatedTask.id], 'execution-started');
  return { workspace: ws.directoryName, task: updatedTask, branch: { name: branchName, baseBranch, repositories: branchResults }, githubSync: board };
}

function createBranchInRepos(ws, repoIds, branchName, baseBranch) {
  if (branchName === baseBranch) throw new Error('Feature branch must differ from baseBranch.');
  if (new Set(repoIds).size !== repoIds.length) throw new Error('Repository ids must not contain duplicates.');
  const plans = repoIds.map((repoId) => {
    const repo = ws.repositories.find((r) => r.id === repoId);
    if (!repo) throw new Error(`Repository "${repoId}" was not found in workspace.`);
    const inside = runGit(repo.root, ['rev-parse', '--is-inside-work-tree']);
    if (inside.status !== 0 || inside.stdout.trim() !== 'true') {
      throw new Error(`Repository "${repoId}" is not a Git working tree: ${repo.root}`);
    }
    const dirty = runGit(repo.root, ['status', '--porcelain']);
    if (dirty.status !== 0 || dirty.stdout.trim()) {
      throw new Error(`Repository "${repoId}" has uncommitted changes; refusing to switch branches.`);
    }
    const current = runGit(repo.root, ['branch', '--show-current']);
    const originalBranch = current.stdout.trim();
    if (current.status !== 0 || !originalBranch) throw new Error(`Repository "${repoId}" is in detached HEAD state.`);
    if (runGit(repo.root, ['show-ref', '--verify', '--quiet', `refs/heads/${baseBranch}`]).status !== 0) {
      throw new Error(`Base branch "${baseBranch}" does not exist in repository "${repoId}".`);
    }
    const baseCommit = assertGit(repo.root, ['rev-parse', baseBranch], `resolve ${baseBranch} in ${repoId}`).stdout.trim();
    const branchExists = runGit(repo.root, ['show-ref', '--verify', '--quiet', `refs/heads/${branchName}`]).status === 0;
    const upstream = runGit(repo.root, ['rev-parse', '--abbrev-ref', `${baseBranch}@{upstream}`]);
    return { repository: repoId, root: repo.root, originalBranch, branchExists, upstream: upstream.status === 0, baseBranch, baseCommit };
  });

  const results = [];
  try {
    for (const plan of plans) {
      const result = { ...plan, branch: branchName, created: false, success: false };
      results.push(result);
      assertGit(plan.root, ['checkout', baseBranch], `checkout ${baseBranch} in ${plan.repository}`);
      if (plan.upstream) {
        assertGit(plan.root, ['pull', '--ff-only'], `fast-forward ${baseBranch} in ${plan.repository}`);
        result.baseUpdated = assertGit(plan.root, ['rev-parse', baseBranch], `resolve updated ${baseBranch} in ${plan.repository}`).stdout.trim() !== plan.baseCommit;
      }
      if (plan.branchExists) {
        assertGit(plan.root, ['checkout', branchName], `checkout existing ${branchName} in ${plan.repository}`);
        result.alreadyExisted = true;
      } else {
        assertGit(plan.root, ['checkout', '-b', branchName], `create ${branchName} in ${plan.repository}`);
        result.created = true;
      }
      result.success = true;
    }
  } catch (error) {
    const rollbackErrors = rollbackBranches(results, branchName);
    const suffix = rollbackErrors.length ? ` Rollback errors: ${rollbackErrors.join('; ')}` : '';
    throw new Error(`${error.message}.${suffix}`);
  }
  return results;
}

function runGit(root, args) {
  return spawnSync('git', args, { cwd: root, encoding: 'utf8', timeout: 120000 });
}

function assertGit(root, args, operation) {
  const result = runGit(root, args);
  if (result.status !== 0) {
    const output = [result.error && result.error.message, result.stderr, result.stdout].filter(Boolean).join('\n').trim();
    throw new Error(`Git operation failed (${operation}): ${output}`);
  }
  return result;
}

function rollbackBranches(results, branchName) {
  const errors = [];
  for (const result of [...results].reverse()) {
    if (!result.root || !result.originalBranch) continue;
    const restore = runGit(result.root, ['checkout', result.originalBranch]);
    if (restore.status !== 0) {
      errors.push(`${result.repository}: could not restore ${result.originalBranch}`);
      continue;
    }
    if (result.created) {
      const remove = runGit(result.root, ['branch', '-D', branchName]);
      if (remove.status !== 0) errors.push(`${result.repository}: could not delete created branch ${branchName}`);
    }
    if (result.baseUpdated) {
      const restoreBase = result.originalBranch === result.baseBranch
        ? runGit(result.root, ['reset', '--hard', result.baseCommit])
        : runGit(result.root, ['branch', '-f', result.baseBranch, result.baseCommit]);
      if (restoreBase.status !== 0) errors.push(`${result.repository}: could not restore ${result.baseBranch} to ${result.baseCommit}`);
    }
  }
  return errors;
}

function finishTaskExecution(args, getWorkspace) {
  const ws = getWorkspace(args.workspace);
  const task = resolveTask(ws, args.task);

  if (!['in-progress', 'reviewing'].includes(task.executionState)) {
    const hint = task.executionState ? `current execution_state: "${task.executionState}"` : 'start_task_execution was not called';
    throw new Error(`Cannot finish task "${task.id}": ${hint}.`);
  }

  // Review loop gate: unless skipReview is explicitly true, return review payload without moving to Testing
  if (args.skipReview !== true) {
    const reviewPayload = buildReviewPayload(ws, task, ws.tokenPolicy && ws.tokenPolicy.reviewDiffBudgetTokens);
    let reviewTask = task;
    if (task.executionState !== 'reviewing') {
      writeFileAtomic(task.filePath, buildTaskMarkdown({ ...task, executionState: 'reviewing' }));
      reviewTask = parseTaskFile(task.filePath);
    }
    rememberActiveTasks(ws.directoryName, [task.id], 'review-requested');
    return {
      workspace: ws.directoryName,
      task: summarizeTask(reviewTask),
      movedToTesting: false,
      review: reviewPayload,
    };
  }

  const board = syncBoardForStatus(ws, task, BOARD_STATUS.testing);
  const nextStatus = 'implemented';
  if (task.status !== 'implemented') validateTransition(task, nextStatus);
  const finishedTask = {
    ...task,
    status: nextStatus,
    executionState: 'testing',
    executionFinishedAt: new Date().toISOString(),
    ...(board.enabled ? { githubProjectStatus: board.status.name } : {}),
  };
  try {
    writeFileAtomic(task.filePath, buildTaskMarkdown(finishedTask));
    updateTaskStatusInReadme(ws, finishedTask, nextStatus);
  } catch (error) {
    const compensationErrors = [];
    if (board.enabled && task.githubProjectStatus) {
      try { moveTaskCard(ws, task, task.githubProjectStatus); } catch (compensationError) {
        compensationErrors.push(`restore board status: ${compensationError.message}`);
      }
    }
    const suffix = compensationErrors.length ? ` Compensation errors: ${compensationErrors.join('; ')}` : '';
    throw new Error(`${error.message}.${suffix}`);
  }
  const updatedTask = parseTaskFile(task.filePath);
  rememberActiveTasks(ws.directoryName, [updatedTask.id], 'execution-finished');
  return { workspace: ws.directoryName, task: updatedTask, movedToTesting: true, githubSync: board };
}

function buildReviewPayload(ws, task, maxTokens = 2000) {
  const diffs = [];
  const spec = truncateToTokenBudget(task.body, 4000);
  const perRepositoryBudget = Math.max(200, Math.floor(maxTokens / Math.max(1, task.repositories.length)));
  for (const repoId of task.repositories) {
    const repo = ws.repositories.find((r) => r.id === repoId);
    if (!repo) continue;
    const diff = getRepoDiff(repo.root, task.baseBranch);
    const preview = truncateToTokenBudget(diff, perRepositoryBudget);
    diffs.push({
      repository: repoId,
      root: repo.root,
      contentHash: contentHash(diff),
      estimatedTokens: estimateTokens(diff),
      characters: diff.length,
      preview: preview.content,
      previewTokens: preview.includedTokens,
      truncated: preview.truncated,
      nextOffset: preview.nextOffset,
    });
  }

  return {
    instruction: 'Compare spec to previews. Fetch only missing pages with get_task_diff. Fix issues and repeat; after a clean review, ask for user confirmation.',
    spec: { id: task.id, title: task.title, scope: task.scope, body: spec.content, bodyTruncated: spec.truncated, validation: task.validation },
    diffs,
    estimatedResponseTokens: spec.includedTokens + diffs.reduce((total, item) => total + item.previewTokens, 0),
    avoidedDiffTokens: diffs.reduce((total, item) => total + Math.max(0, item.estimatedTokens - item.previewTokens), 0),
    diffBudgetTokens: maxTokens,
  };
}

function getTaskDiff(args, getWorkspace) {
  const ws = getWorkspace(args.workspace);
  const task = resolveTask(ws, args.task);
  const repositoryId = args.repository ? ensureString(args.repository, 'repository') : task.repositories[0];
  if (!repositoryId) throw new Error(`Task "${task.id}" has no repositories.`);
  if (!task.repositories.includes(repositoryId)) throw new Error(`Repository "${repositoryId}" is not linked to task "${task.id}".`);
  const repo = ws.repositories.find((candidate) => candidate.id === repositoryId);
  if (!repo) throw new Error(`Repository "${repositoryId}" was not found in workspace "${ws.directoryName}".`);
  const maxTokens = args.maxTokens === undefined
    ? ((ws.tokenPolicy && ws.tokenPolicy.reviewDiffBudgetTokens) || 2000)
    : ensurePositiveInteger(args.maxTokens, 'maxTokens', 12000);
  const offset = args.offset === undefined ? 0 : args.offset;
  const diff = getRepoDiff(repo.root, task.baseBranch);
  return {
    workspace: ws.directoryName,
    task: task.id,
    repository: repositoryId,
    contentHash: contentHash(diff),
    ...pageByTokenBudget(diff, offset, maxTokens),
  };
}

function getRepoDiff(repoRoot, baseBranch) {
  const base = baseBranch || 'main';

  // Staged + unstaged changes relative to HEAD
  const result = spawnSync('git', ['diff', 'HEAD', '--stat', '--patch', '--no-color'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 50,
    timeout: 30000,
  });
  if (result.status !== 0) {
    return `(git diff failed: ${result.error ? result.error.message : (result.stderr || '').trim()})`;
  }
  const output = (result.stdout || '').trim();
  if (!output) {
    // Try diff against baseBranch for committed-but-not-merged changes
    const branchDiff = spawnSync('git', ['diff', `${base}...HEAD`, '--stat', '--patch', '--no-color'], {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 50,
      timeout: 30000,
    });
    if (branchDiff.status === 0 && branchDiff.stdout.trim()) {
      return branchDiff.stdout.trim();
    }
    return '(no changes detected)';
  }
  return output;
}

function normalizePrHandoff(value, legacyPullRequests) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Field "prHandoff.decision" is required when closing a task. Ask the user whether to skip PR, use existing PRs, or create new PRs.');
  }

  const decision = ensureString(value.decision, 'prHandoff.decision');
  const allowed = new Set(['skip', 'current-branch', 'new-branch', 'create']);
  if (!allowed.has(decision)) {
    throw new Error('Field "prHandoff.decision" must be one of: skip, current-branch, new-branch, create.');
  }

  const pullRequests = value.pullRequests || legacyPullRequests || [];
  if (!Array.isArray(pullRequests)) {
    throw new Error('Field "prHandoff.pullRequests" must be an array when provided.');
  }

  // 'create' will generate PRs automatically — no need to require URLs upfront
  if (decision !== 'skip' && decision !== 'create' && pullRequests.length === 0) {
    throw new Error('PR handoff was selected, but no pullRequests were provided. Open the PRs first, then close the task with their URLs.');
  }

  return { decision, pullRequests, targetBranch: value.targetBranch || 'main' };
}

function createPullRequests(ws, task, targetBranch) {
  const results = [];
  for (const repoId of task.repositories) {
    const repo = ws.repositories.find((r) => r.id === repoId);
    if (!repo) continue;

    // Get current branch
    const branchResult = spawnSync('git', ['branch', '--show-current'], { cwd: repo.root, encoding: 'utf8', timeout: 30000 });
    const currentBranch = (branchResult.stdout || '').trim();
    if (!currentBranch || currentBranch === targetBranch) {
      results.push({ repository: repoId, success: false, error: `Already on ${targetBranch} or could not detect branch` });
      continue;
    }

    // Push branch to origin
    const push = spawnSync('git', ['push', '-u', 'origin', currentBranch], { cwd: repo.root, encoding: 'utf8', timeout: 120000 });
    if (push.status !== 0) {
      results.push({ repository: repoId, success: false, error: `push failed: ${(push.stderr || '').trim()}` });
      continue;
    }

    // Create PR via gh cli
    const prCreate = spawnSync('gh', ['pr', 'create', '--base', targetBranch, '--head', currentBranch, '--title', task.title, '--body', `Workspace task: \`${task.id}\`\nScope: \`${task.scope || task.id}\``], {
      cwd: repo.root,
      encoding: 'utf8',
      timeout: 60000,
    });

    if (prCreate.status !== 0) {
      const stderr = (prCreate.stderr || '').trim();
      // PR might already exist
      if (stderr.includes('already exists')) {
        // Try to get existing PR URL
        const prView = spawnSync('gh', ['pr', 'view', '--json', 'url', '-q', '.url'], { cwd: repo.root, encoding: 'utf8', timeout: 60000 });
        const url = (prView.stdout || '').trim();
        results.push({ repository: repoId, success: true, url, alreadyExisted: true });
      } else {
        results.push({ repository: repoId, success: false, error: stderr });
      }
      continue;
    }

    const url = (prCreate.stdout || '').trim();
    results.push({ repository: repoId, success: true, url, created: true });
  }
  return results;
}

function setTaskBoardStatus(args, getWorkspace) {
  const ws = getWorkspace(args.workspace);
  const task = resolveTask(ws, args.task);
  const statusName = resolveBoardStatusName(args.status);
  const board = syncBoardForStatus(ws, task, statusName);
  if (board.enabled) {
    updateTaskFrontmatter(task.filePath, { githubProjectStatus: board.status.name });
  }
  const updatedTask = parseTaskFile(task.filePath);
  rememberActiveTasks(ws.directoryName, [updatedTask.id], `board-${statusName}`);
  return { workspace: ws.directoryName, task: updatedTask, githubSync: board };
}

function syncBoardForStatus(ws, task, statusName) {
  if (!ws.githubProject) return { enabled: false, reason: 'githubProject not configured' };
  if (!task.githubProjectItemId) {
    throw new Error(`Task "${task.id}" cannot move to "${statusName}" because it has no github_project_item_id frontmatter.`);
  }
  return moveTaskCard(ws, task, statusName);
}

function updateTaskFrontmatter(taskFilePath, updates) {
  const task = parseTaskFile(taskFilePath);
  const updatedTask = { ...task, ...updates };
  writeFileAtomic(taskFilePath, buildTaskMarkdown(updatedTask));
}

function resolveBoardStatusName(status) {
  const normalized = ensureString(status, 'status').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const map = {
    todo: BOARD_STATUS.todo,
    'in-progress': BOARD_STATUS.inProgress,
    inprogress: BOARD_STATUS.inProgress,
    testing: BOARD_STATUS.testing,
    done: BOARD_STATUS.done,
  };
  if (!map[normalized]) throw new Error('Board status must be one of: todo, in-progress, testing, done.');
  return map[normalized];
}

function buildDoneSummary(task) {
  return `Task \`${task.id}\` was documented, validated by the user, and closed in the runner.`;
}


function buildContextFile(task, context) {
  return [
    `# Execution Context: ${task.id}`,
    '',
    '> This file is a pre-computed context snapshot created during task planning.',
    '> The executor agent should read this BEFORE implementing the task to avoid',
    '> re-discovering information that was already gathered during the conversation.',
    '> This saves tokens and execution time.',
    '',
    '## Cached Knowledge',
    '',
    context,
    '',
    '---',
    `Generated: ${new Date().toISOString()}`,
    '',
  ].join('\n');
}

function loadTaskContext(task, options = {}) {
  const contextPath = task.filePath.replace(/\.md$/, '.context.md');
  if (fs.existsSync(contextPath)) {
    const source = fs.readFileSync(contextPath, 'utf8');
    const maxTokens = options.maxTokens || 4000;
    let assembly;
    let cacheError = null;
    if (options.workspace) {
      try {
        assembly = assembleTaskContext(options.workspace, task, maxTokens);
      } catch (error) {
        cacheError = error.message;
      }
    }
    assembly = assembly || fallbackContext(source, maxTokens, options.workspace);
    return {
      hasContext: true,
      path: contextPath,
      content: assembly.content,
      manifest: {
        version: 1,
        fingerprint: assembly.fingerprint,
        unitIds: assembly.unitIds,
        sourceTokens: assembly.sourceTokens,
        includedTokens: assembly.includedTokens,
        truncated: assembly.truncated,
        cacheHits: assembly.cacheHits,
        cacheMisses: assembly.cacheMisses,
        cachePath: assembly.cachePath,
      },
      ...(cacheError ? { cacheError } : {}),
    };
  }
  return { hasContext: false, path: contextPath, content: null };
}

function compactTaskContext(args, getWorkspace) {
  const ws = getWorkspace(args.workspace);
  const task = resolveTask(ws, args.task);
  const contextPath = task.filePath.replace(/\.md$/, '.context.md');
  if (!fs.existsSync(contextPath)) throw new Error(`Task "${task.id}" has no context snapshot.`);
  const existing = fs.readFileSync(contextPath, 'utf8').trim();
  if (existing.startsWith(MANIFEST_MARKER)) {
    return { workspace: ws.directoryName, task: task.id, contextPath, unchanged: true };
  }
  const hash = contentHash(existing);
  const sourceDir = path.join(ws.sddRoot, 'context-sources');
  const sourcePath = path.join(sourceDir, `${hash}.md`);
  fs.mkdirSync(sourceDir, { recursive: true });
  if (!fs.existsSync(sourcePath)) writeFileAtomic(sourcePath, `${existing}\n`);
  const manifest = {
    version: 1,
    taskId: task.id,
    contentHash: hash,
    sourcePath: path.relative(ws.wsDir, sourcePath).split(path.sep).join('/'),
  };
  writeFileAtomic(contextPath, `${MANIFEST_MARKER}\n${JSON.stringify(manifest, null, 2)}\n`);
  const assembled = loadTaskContext(task, { workspace: ws, maxTokens: ws.tokenPolicy.contextBudgetTokens });
  return { workspace: ws.directoryName, task: task.id, contextPath, sourcePath, manifest: assembled.manifest, unchanged: false };
}

function deriveBranchName(tasks, scope) {
  const base = scope || tasks[0].scope || tasks[0].id;
  return `feat/${slugify(base)}`;
}

module.exports = {
  VALID_TASK_STATUSES,
  listTasks,
  resolveTask,
  summarizeTask,
  rememberActiveTasks,
  getActiveTasks,
  validateTransition,
  createTask,
  setTaskStatus,
  setTaskBoardStatus,
  startTaskExecution,
  createBranchInRepos,
  rollbackBranches,
  finishTaskExecution,
  getTaskDiff,
  compactTaskContext,
  updateTaskStatusInReadme,
  loadTaskContext,
};
