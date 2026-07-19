'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { slugify, normalizeSearchValue, ensureString, ensureStringArray, escapeRegExp } = require('./utils');
const { parseTaskFile, buildTaskMarkdown, writeFileAtomic } = require('./frontmatter');
const { BOARD_STATUS, createTaskCard, moveTaskCard, updateTaskCardCloseout } = require('./github-sync');

const VALID_TASK_STATUSES = new Set(['open', 'implemented', 'needs-rework', 'done']);

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
  return path.join(ROOT, 'workspaces', workspaceName, 'runs', '.active-session.json');
}

function loadActiveSession(workspaceName) {
  if (activeTasksByWorkspace.has(workspaceName)) return;
  const sessionFile = activeSessionPath(workspaceName);
  if (fs.existsSync(sessionFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
      if (Array.isArray(data)) activeTasksByWorkspace.set(workspaceName, data);
    } catch { /* corrupted file, start fresh */ }
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
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => parseTaskFile(path.join(ws.tasksDir, f)));

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

function createTask(args, getWorkspace) {
  const ws = getWorkspace(args.workspace);
  const title = ensureString(args.title, 'title');
  const id = slugify(args.id || title);
  const scope = slugify(args.scope || id);
  const repositories = ensureStringArray(args.repositories, 'repositories', true);
  const body = ensureString(args.body, 'body');
  const knownRepos = new Set(ws.repositories.map((r) => r.id));
  const unknown = repositories.filter((r) => !knownRepos.has(r));
  if (unknown.length) throw new Error(`Unknown repositories: ${unknown.join(', ')}`);

  fs.mkdirSync(ws.tasksDir, { recursive: true });
  const taskPath = path.join(ws.tasksDir, buildTaskFileName(ws, id));

  // Idempotency: O_EXCL ensures atomic creation — fails if file already exists
  let fd;
  try {
    fd = fs.openSync(taskPath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY);
  } catch (err) {
    if (err.code === 'EEXIST') throw new Error(`Task "${id}" already exists at ${path.basename(taskPath)}.`);
    throw err;
  }

  const task = {
    id, title, scope, status: 'open', repositories,
    validation: ensureStringArray(args.validation, 'validation'),
    docsTargets: ensureStringArray(args.docsTargets || args.docs_targets, 'docsTargets'),
    dependsOn: ensureStringArray(args.dependsOn || args.depends_on, 'dependsOn'),
    baseBranch: null,
    createdAt: new Date().toISOString(),
    finishedAt: null,
    body,
  };

  // Intent goes ONLY to the GitHub card (human-readable context), never to the local task file
  const intent = args.intent ? String(args.intent).trim() : null;
  if (intent) task.intent = intent;

  // Context snapshot: cached knowledge for the executor agent (saves tokens on execution)
  const context = args.context ? String(args.context).trim() : null;

  const githubSync = createTaskCard(ws, task);

  // Remove intent before persisting locally — it's card-only
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

  // Write content atomically: write to fd, then close
  const content = buildTaskMarkdown(task);
  fs.writeSync(fd, content);
  fs.closeSync(fd);

  const parsedTask = parseTaskFile(taskPath);

  // Write context snapshot as sibling file (executor pre-load, saves tokens)
  let contextPath = null;
  if (context) {
    contextPath = taskPath.replace(/\.md$/, '.context.md');
    writeFileAtomic(contextPath, buildContextFile(parsedTask, context));
  }

  updateTaskStatusInReadme(ws, parsedTask, 'open');
  rememberActiveTasks(ws.directoryName, [parsedTask.id], 'created-by-mcp');
  return { workspace: ws.directoryName, task: parsedTask, githubSync, contextPath };
}

function setTaskStatus(args, getWorkspace) {
  const ws = getWorkspace(args.workspace);
  const status = ensureString(args.status, 'status').toLowerCase();
  if (!VALID_TASK_STATUSES.has(status)) throw new Error(`Unsupported status "${status}".`);
  if (status === 'done' && args.userValidated !== true) throw new Error('Refusing to mark done without userValidated: true.');
  const prHandoff = status === 'done' ? normalizePrHandoff(args.prHandoff, args.pullRequests) : null;

  const task = resolveTask(ws, args.task);

  // Validate state machine transition
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
      // Populate pullRequests from created PRs
      prHandoff.pullRequests = prResults.filter((r) => r.success).map((r) => ({ repository: r.repository, url: r.url }));
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
  if (status === 'done') updatedTask.finishedAt = new Date().toISOString();
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

  // Auto-create feature branch in affected repos
  const branchName = args.branchName || deriveBranchName([task], task.scope);
  const baseBranch = args.baseBranch || 'main';
  const branchResults = createBranchInRepos(ws, task.repositories, branchName, baseBranch);

  // Persist baseBranch in frontmatter for later use in diff
  updateTaskFrontmatter(task.filePath, { baseBranch });

  const board = syncBoardForStatus(ws, task, BOARD_STATUS.inProgress);
  if (board.enabled) {
    updateTaskFrontmatter(task.filePath, { githubProjectStatus: board.status.name });
  }
  const updatedTask = parseTaskFile(task.filePath);
  rememberActiveTasks(ws.directoryName, [updatedTask.id], 'execution-started');
  return { workspace: ws.directoryName, task: updatedTask, branch: { name: branchName, baseBranch, repositories: branchResults }, githubSync: board };
}

function createBranchInRepos(ws, repoIds, branchName, baseBranch) {
  const results = [];
  const created = []; // track for rollback

  for (const repoId of repoIds) {
    const repo = ws.repositories.find((r) => r.id === repoId);
    if (!repo) { results.push({ repository: repoId, success: false, error: 'not found in workspace' }); continue; }

    // Checkout base, pull, create branch
    const checkout = spawnSync('git', ['checkout', baseBranch], { cwd: repo.root, encoding: 'utf8' });
    if (checkout.status !== 0) {
      // Rollback all previously created branches
      rollbackBranches(created, branchName, baseBranch);
      throw new Error(`Branch creation failed in "${repoId}" (checkout ${baseBranch}): ${(checkout.stderr || '').trim()}. Rolled back ${created.length} repo(s).`);
    }
    spawnSync('git', ['pull', '--ff-only'], { cwd: repo.root, encoding: 'utf8' });

    const create = spawnSync('git', ['checkout', '-b', branchName], { cwd: repo.root, encoding: 'utf8' });
    if (create.status !== 0) {
      if ((create.stderr || '').includes('already exists')) {
        spawnSync('git', ['checkout', branchName], { cwd: repo.root, encoding: 'utf8' });
        results.push({ repository: repoId, success: true, branch: branchName, alreadyExisted: true });
        created.push({ repoId, root: repo.root });
      } else {
        // Rollback all previously created branches
        rollbackBranches(created, branchName, baseBranch);
        throw new Error(`Branch creation failed in "${repoId}": ${(create.stderr || '').trim()}. Rolled back ${created.length} repo(s).`);
      }
      continue;
    }
    results.push({ repository: repoId, success: true, branch: branchName, created: true });
    created.push({ repoId, root: repo.root });
  }
  return results;
}

function rollbackBranches(created, branchName, baseBranch) {
  for (const { root } of created) {
    spawnSync('git', ['checkout', baseBranch], { cwd: root, encoding: 'utf8' });
    spawnSync('git', ['branch', '-D', branchName], { cwd: root, encoding: 'utf8' });
  }
}

function finishTaskExecution(args, getWorkspace) {
  const ws = getWorkspace(args.workspace);
  const task = resolveTask(ws, args.task);

  // Lifecycle gate: start must have been called first
  if (!task.githubProjectStatus || task.githubProjectStatus !== 'In Progress') {
    const hint = task.githubProjectStatus
      ? `current board status: "${task.githubProjectStatus}"`
      : 'no board status recorded (start_task_execution was not called)';
    throw new Error(`Cannot finish task "${task.id}": it must be In Progress first. ${hint}. Call start_task_execution before finish.`);
  }

  // Review loop gate: unless skipReview is explicitly true, return review payload without moving to Testing
  if (args.skipReview !== true) {
    const reviewPayload = buildReviewPayload(ws, task);
    rememberActiveTasks(ws.directoryName, [task.id], 'review-requested');
    return {
      workspace: ws.directoryName,
      task: summarizeTask(task),
      movedToTesting: false,
      review: reviewPayload,
    };
  }

  // skipReview: true — move to Testing
  const board = syncBoardForStatus(ws, task, BOARD_STATUS.testing);
  if (board.enabled) {
    updateTaskFrontmatter(task.filePath, { githubProjectStatus: board.status.name });
  }
  const updatedTask = parseTaskFile(task.filePath);
  rememberActiveTasks(ws.directoryName, [updatedTask.id], 'execution-finished');
  return { workspace: ws.directoryName, task: updatedTask, movedToTesting: true, githubSync: board };
}

function buildReviewPayload(ws, task) {
  const diffs = [];
  for (const repoId of task.repositories) {
    const repo = ws.repositories.find((r) => r.id === repoId);
    if (!repo) continue;
    const diff = getRepoDiff(repo.root, task.baseBranch);
    diffs.push({ repository: repoId, root: repo.root, diff });
  }

  return {
    instruction: [
      'REVIEW LOOP: Compare the task spec below against the git diff of what was implemented.',
      'Check for:',
      '- Missing requirements from the spec that were not implemented',
      '- Bugs, typos, or logic errors in the new/modified code',
      '- Contract mismatches (wrong types, missing fields, incorrect status codes)',
      '- Unintended side effects or regressions',
      '',
      'If you find issues: fix them, then call finish_task_execution again (without skipReview).',
      'If everything looks correct: ask the user to confirm, then call finish_task_execution with skipReview: true.',
    ].join('\n'),
    spec: { id: task.id, title: task.title, scope: task.scope, body: task.body, validation: task.validation },
    diffs,
  };
}

function getRepoDiff(repoRoot, baseBranch) {
  const base = baseBranch || 'main';

  // Staged + unstaged changes relative to HEAD
  const result = spawnSync('git', ['diff', 'HEAD', '--stat', '--patch', '--no-color'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 5,
  });
  if (result.status !== 0) {
    return `(git diff failed: ${(result.stderr || '').trim()})`;
  }
  const output = (result.stdout || '').trim();
  if (!output) {
    // Try diff against baseBranch for committed-but-not-merged changes
    const branchDiff = spawnSync('git', ['diff', `${base}...HEAD`, '--stat', '--patch', '--no-color'], {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 5,
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
    const branchResult = spawnSync('git', ['branch', '--show-current'], { cwd: repo.root, encoding: 'utf8' });
    const currentBranch = (branchResult.stdout || '').trim();
    if (!currentBranch || currentBranch === targetBranch) {
      results.push({ repository: repoId, success: false, error: `Already on ${targetBranch} or could not detect branch` });
      continue;
    }

    // Push branch to origin
    const push = spawnSync('git', ['push', '-u', 'origin', currentBranch], { cwd: repo.root, encoding: 'utf8' });
    if (push.status !== 0) {
      results.push({ repository: repoId, success: false, error: `push failed: ${(push.stderr || '').trim()}` });
      continue;
    }

    // Create PR via gh cli
    const prCreate = spawnSync('gh', ['pr', 'create', '--base', targetBranch, '--head', currentBranch, '--title', task.title, '--body', `Workspace task: \`${task.id}\`\nScope: \`${task.scope || task.id}\``], {
      cwd: repo.root,
      encoding: 'utf8',
    });

    if (prCreate.status !== 0) {
      const stderr = (prCreate.stderr || '').trim();
      // PR might already exist
      if (stderr.includes('already exists')) {
        // Try to get existing PR URL
        const prView = spawnSync('gh', ['pr', 'view', '--json', 'url', '-q', '.url'], { cwd: repo.root, encoding: 'utf8' });
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

function loadTaskContext(task) {
  const contextPath = task.filePath.replace(/\.md$/, '.context.md');
  if (fs.existsSync(contextPath)) {
    return { hasContext: true, path: contextPath, content: fs.readFileSync(contextPath, 'utf8') };
  }
  return { hasContext: false, path: contextPath, content: null };
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
  createTask,
  setTaskStatus,
  setTaskBoardStatus,
  startTaskExecution,
  finishTaskExecution,
  updateTaskStatusInReadme,
  loadTaskContext,
};
