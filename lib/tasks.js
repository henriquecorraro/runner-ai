'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { slugify, normalizeSearchValue, ensureString, ensureStringArray, escapeRegExp } = require('./utils');
const { parseTaskFile, buildTaskMarkdown } = require('./frontmatter');
const { BOARD_STATUS, createTaskCard, moveTaskCard, updateTaskCardCloseout } = require('./github-sync');

const VALID_TASK_STATUSES = new Set(['open', 'implemented', 'needs-rework', 'done']);
const activeTasksByWorkspace = new Map();

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

function rememberActiveTasks(workspaceName, taskIds, reason) {
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
}

function getActiveTasks(workspaceName) {
  return activeTasksByWorkspace.get(workspaceName) || [];
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
    fs.writeFileSync(readmePath, content.replace(statusLinePattern, `$1${status}$2`));
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

  fs.writeFileSync(readmePath, `${content.slice(0, sectionStart)}${updatedBody}${content.slice(sectionEnd)}`);
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
  if (fs.existsSync(taskPath)) throw new Error(`Task "${id}" already exists.`);

  const task = {
    id, title, scope, status: 'open', repositories,
    validation: ensureStringArray(args.validation, 'validation'),
    docsTargets: ensureStringArray(args.docsTargets || args.docs_targets, 'docsTargets'),
    dependsOn: ensureStringArray(args.dependsOn || args.depends_on, 'dependsOn'),
    body,
  };

  const githubSync = createTaskCard(ws, task);
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

  fs.writeFileSync(taskPath, buildTaskMarkdown(task));
  const parsedTask = parseTaskFile(taskPath);
  updateTaskStatusInReadme(ws, parsedTask, 'open');
  rememberActiveTasks(ws.directoryName, [parsedTask.id], 'created-by-mcp');
  return { workspace: ws.directoryName, task: parsedTask, githubSync };
}

function setTaskStatus(args, getWorkspace) {
  const ws = getWorkspace(args.workspace);
  const status = ensureString(args.status, 'status').toLowerCase();
  if (!VALID_TASK_STATUSES.has(status)) throw new Error(`Unsupported status "${status}".`);
  if (status === 'done' && args.userValidated !== true) throw new Error('Refusing to mark done without userValidated: true.');
  const prHandoff = status === 'done' ? normalizePrHandoff(args.prHandoff, args.pullRequests) : null;

  const task = resolveTask(ws, args.task);
  let githubSync = { enabled: false, reason: 'status does not require GitHub sync' };
  if (status === 'implemented') {
    const board = syncBoardForStatus(ws, task, BOARD_STATUS.testing);
    githubSync = { enabled: board.enabled, board };
  } else if (status === 'done') {
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

  const content = fs.readFileSync(task.filePath, 'utf8');
  if (!/^status:\s+.*$/m.test(content)) throw new Error(`Task "${task.id}" has no status line to update.`);
  const updated = content.replace(/^status:\s+.*$/m, `status: ${status}`);

  fs.writeFileSync(task.filePath, updated);
  if (githubSync.enabled && githubSync.board.enabled) {
    updateTaskFrontmatter(task.filePath, { githubProjectStatus: githubSync.board.status.name });
  }
  const updatedTask = parseTaskFile(task.filePath);
  const readme = updateTaskStatusInReadme(ws, task, status);
  rememberActiveTasks(ws.directoryName, [updatedTask.id], `status-${status}`);
  return { workspace: ws.directoryName, task: updatedTask, readme, githubSync };
}

function startTaskExecution(args, getWorkspace) {
  const ws = getWorkspace(args.workspace);
  const task = resolveTask(ws, args.task);
  const board = syncBoardForStatus(ws, task, BOARD_STATUS.inProgress);
  if (board.enabled) {
    updateTaskFrontmatter(task.filePath, { githubProjectStatus: board.status.name });
  }
  const updatedTask = parseTaskFile(task.filePath);
  rememberActiveTasks(ws.directoryName, [updatedTask.id], 'execution-started');
  return { workspace: ws.directoryName, task: updatedTask, githubSync: board };
}

function finishTaskExecution(args, getWorkspace) {
  const ws = getWorkspace(args.workspace);
  const task = resolveTask(ws, args.task);

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
    const diff = getRepoDiff(repo.root);
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

function getRepoDiff(repoRoot) {
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
    // Try diff against main/master for committed-but-not-merged changes
    const branchDiff = spawnSync('git', ['diff', 'main...HEAD', '--stat', '--patch', '--no-color'], {
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
    throw new Error('Field "prHandoff.decision" is required when closing a task. Ask whether to skip PR handoff, use the current branch, or create a new branch.');
  }

  const decision = ensureString(value.decision, 'prHandoff.decision');
  const allowed = new Set(['skip', 'current-branch', 'new-branch']);
  if (!allowed.has(decision)) {
    throw new Error('Field "prHandoff.decision" must be one of: skip, current-branch, new-branch.');
  }

  const pullRequests = value.pullRequests || legacyPullRequests || [];
  if (!Array.isArray(pullRequests)) {
    throw new Error('Field "prHandoff.pullRequests" must be an array when provided.');
  }

  if (decision !== 'skip' && pullRequests.length === 0) {
    throw new Error('PR handoff was selected, but no pullRequests were provided. Open the PRs first, then close the task with their URLs.');
  }

  return { decision, pullRequests };
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
  fs.writeFileSync(taskFilePath, buildTaskMarkdown(updatedTask));
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
};
