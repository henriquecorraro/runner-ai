'use strict';

/**
 * Lightweight bidirectional reconcile between local task files and GitHub Project cards.
 *
 * Design decisions:
 * - Runs on demand (not on every read) to avoid API costs
 * - Reports drift without auto-fixing by default (dryRun: true)
 * - When autoFix is true, local wins for status (agent is source of truth for execution)
 *   and GitHub wins for metadata edits (title, body edits in browser)
 * - Never deletes tasks or issues — only syncs status and metadata
 */

const { spawnSync } = require('node:child_process');
const { buildTaskMarkdown, writeFileAtomic } = require('./frontmatter');
const { listTasks } = require('./tasks');
const { BOARD_STATUS } = require('./github-sync');

// Maps local status → expected board status
const STATUS_TO_BOARD = {
  open: BOARD_STATUS.todo,
  'needs-rework': BOARD_STATUS.todo,
  implemented: BOARD_STATUS.testing,
  done: BOARD_STATUS.done,
};

/**
 * Reconcile a workspace's tasks with their GitHub Project state.
 *
 * @param {object} ws - Resolved workspace object
 * @param {object} options
 * @param {boolean} options.dryRun - If true (default), only report drift without fixing
 * @param {string} options.direction - 'both' (default), 'local-to-github', or 'github-to-local'
 * @returns {object} Reconcile report
 */
function reconcile(ws, options = {}) {
  const { dryRun = true, direction = 'both' } = options;
  if (!['both', 'local-to-github', 'github-to-local'].includes(direction)) {
    throw new Error('Reconcile direction must be one of: both, local-to-github, github-to-local.');
  }

  if (!ws.githubProject) {
    return { enabled: false, reason: 'githubProject not configured', drifts: [] };
  }

  const tasks = listTasks(ws).filter((t) => t.githubProjectItemId);
  if (!tasks.length) {
    return { enabled: true, drifts: [], checked: 0, fixed: 0, fixes: [], errors: [] };
  }

  const drifts = [];
  const fixes = [];
  const errors = [];

  for (const task of tasks) {
    try {
      const drift = detectDrift(ws, task);
      if (drift) {
        drifts.push(drift);
        if (!dryRun) {
          const fix = applyFix(ws, task, drift, direction);
          if (fix) fixes.push(fix);
        }
      }
    } catch (error) {
      errors.push({ taskId: task.id, error: error.message });
    }
  }

  return {
    enabled: true,
    dryRun,
    direction,
    checked: tasks.length,
    drifts,
    fixed: fixes.length,
    fixes,
    errors,
  };
}

/**
 * Detect drift between local task and its GitHub card.
 */
function detectDrift(ws, task) {
  // Fetch current card status from GitHub
  const cardStatus = fetchCardStatus(ws, task);
  if (!cardStatus) return null;

  const issues = [];

  // Check 1: Board status mismatch
  const expectedBoard = STATUS_TO_BOARD[task.status];
  if (expectedBoard && cardStatus.boardStatus && cardStatus.boardStatus !== expectedBoard) {
    issues.push({
      type: 'board-status-mismatch',
      field: 'status',
      local: { taskStatus: task.status, expectedBoard },
      github: { boardStatus: cardStatus.boardStatus },
    });
  }

  // Check 2: Local frontmatter githubProjectStatus is stale
  if (task.githubProjectStatus && cardStatus.boardStatus && task.githubProjectStatus !== cardStatus.boardStatus) {
    issues.push({
      type: 'frontmatter-status-stale',
      field: 'github_project_status',
      local: task.githubProjectStatus,
      github: cardStatus.boardStatus,
    });
  }

  // Check 3: Issue state mismatch (closed on GitHub but not done locally)
  if (cardStatus.issueState === 'closed' && task.status !== 'done') {
    issues.push({
      type: 'issue-closed-externally',
      field: 'state',
      local: task.status,
      github: 'closed',
    });
  }

  // Check 4: Issue open on GitHub but task is done locally
  if (cardStatus.issueState === 'open' && task.status === 'done') {
    issues.push({
      type: 'issue-open-but-task-done',
      field: 'state',
      local: 'done',
      github: 'open',
    });
  }

  if (!issues.length) return null;

  return {
    taskId: task.id,
    taskFile: task.fileName,
    cardStatus,
    issues,
  };
}

/**
 * Apply a fix for detected drift.
 * Strategy:
 * - local→github: push local status to board
 * - github→local: pull board status to local frontmatter
 */
function applyFix(ws, task, drift, direction) {
  const applied = [];
  let updatedTask = { ...task };
  let finalBoardStatus = drift.cardStatus.boardStatus;

  if (direction === 'local-to-github') {
    const targetBoardStatus = STATUS_TO_BOARD[task.status];
    if (targetBoardStatus && finalBoardStatus !== targetBoardStatus) {
      moveCardToStatus(ws, task, targetBoardStatus);
      applied.push({ type: 'push-board-status', from: finalBoardStatus, to: targetBoardStatus });
      finalBoardStatus = targetBoardStatus;
    }
    if (task.status === 'done' && drift.cardStatus.issueState === 'open') {
      const issueUrls = closeGitHubIssues(task);
      applied.push({ type: 'close-github-issues', issueUrls });
    } else if (task.status !== 'done' && drift.cardStatus.issueState === 'closed') {
      applied.push({ type: 'requires-user-validation', reason: 'GitHub issue is closed but local task is not done' });
    }
  } else if (direction === 'github-to-local') {
    if (finalBoardStatus === BOARD_STATUS.testing && ['open', 'needs-rework'].includes(task.status)) {
      updatedTask.status = 'implemented';
      updatedTask.executionState = 'testing';
      updatedTask.executionFinishedAt = updatedTask.executionFinishedAt || new Date().toISOString();
      applied.push({ type: 'pull-testing-status', from: task.status, to: 'implemented' });
    }
    if ((finalBoardStatus === BOARD_STATUS.done || drift.cardStatus.issueState === 'closed') && task.status !== 'done') {
      applied.push({ type: 'requires-user-validation', reason: 'Refusing to mark done without explicit user validation' });
    }
  } else {
    applied.push({ type: 'conflict-reported', reason: 'Direction "both" is report-only for status conflicts; choose an explicit direction to mutate status.' });
  }

  if (finalBoardStatus && updatedTask.githubProjectStatus !== finalBoardStatus) {
    updatedTask.githubProjectStatus = finalBoardStatus;
    applied.push({ type: 'update-local-frontmatter', field: 'github_project_status', value: finalBoardStatus });
  }
  if (JSON.stringify(updatedTask) !== JSON.stringify(task)) {
    writeFileAtomic(task.filePath, buildTaskMarkdown(updatedTask));
    if (updatedTask.status !== task.status) {
      const { updateTaskStatusInReadme } = require('./tasks');
      updateTaskStatusInReadme(ws, updatedTask, updatedTask.status);
    }
  }

  if (!applied.length) return null;
  return { taskId: task.id, applied };
}

/**
 * Fetch the current card status from GitHub Project.
 */
function fetchCardStatus(ws, task) {
  if (!task.githubProjectItemId) return null;

  const endpoint = `${projectEndpoint(ws.githubProject, `items/${task.githubProjectItemId}`)}`;
  const item = ghApi('GET', endpoint);
  if (!item) throw new Error(`GitHub Project item ${task.githubProjectItemId} returned no data.`);

  let boardStatus = null;
  if (item.fields) {
    for (const field of item.fields) {
      if (field.name && field.name.toLowerCase() === 'status' && field.value) {
        boardStatus = typeof field.value === 'string' ? field.value : (field.value.name || field.value.raw || null);
        break;
      }
    }
  }

  let issueState = null;
  if (task.githubIssueRepo && task.githubIssueNumber) {
    const issue = ghApi('GET', `/repos/${task.githubIssueRepo}/issues/${task.githubIssueNumber}`);
    issueState = issue.state;
  }

  return { boardStatus, issueState };
}

function moveCardToStatus(ws, task, statusName) {
  const { moveTaskCard } = require('./github-sync');
  moveTaskCard(ws, task, statusName);
}

function closeGitHubIssues(task) {
  const targets = [];
  for (const issueUrl of task.githubIssueUrls || []) {
    const parsed = new URL(issueUrl);
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (parsed.hostname !== 'github.com' || segments[2] !== 'issues' || !/^\d+$/.test(segments[3] || '')) {
      throw new Error(`Invalid GitHub issue URL in task "${task.id}": ${issueUrl}`);
    }
    targets.push({ repo: `${segments[0]}/${segments[1]}`, number: Number(segments[3]), url: issueUrl });
  }
  if (!targets.length && task.githubIssueRepo && task.githubIssueNumber) {
    targets.push({ repo: task.githubIssueRepo, number: task.githubIssueNumber, url: task.githubIssueUrl });
  }
  if (!targets.length) throw new Error(`Task "${task.id}" has no GitHub issue metadata.`);

  const seen = new Set();
  const closed = [];
  for (const target of targets) {
    const key = `${target.repo}#${target.number}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ghApi('PATCH', `/repos/${target.repo}/issues/${target.number}`, {
      state: 'closed',
      state_reason: 'completed',
    });
    closed.push(target.url || `https://github.com/${target.repo}/issues/${target.number}`);
  }
  return closed;
}

function projectEndpoint(githubProject, suffix) {
  if (githubProject.ownerType === 'organization') {
    return `/orgs/${githubProject.owner}/projectsV2/${githubProject.number}/${suffix}`;
  }
  if (githubProject.ownerType === 'user') {
    return `/users/${githubProject.owner}/projectsV2/${githubProject.number}/${suffix}`;
  }
  throw new Error(`Unsupported GitHub Project ownerType: ${githubProject.ownerType}`);
}

function ghApi(method, endpoint, body = null) {
  const args = [
    'api', endpoint, '--method', method,
    '--header', 'Accept: application/vnd.github+json',
    '--header', 'X-GitHub-Api-Version: 2026-03-10',
  ];

  const options = { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10, timeout: 30000 };
  if (body !== null) {
    args.push('--input', '-');
    options.input = JSON.stringify(body);
  }

  const result = spawnSync('gh', args, options);
  if (result.status !== 0) {
    const output = [result.error && result.error.message, result.stderr, result.stdout].filter(Boolean).join('\n').trim();
    throw new Error(`GitHub API call failed (${method} ${endpoint}): ${output}`);
  }

  const stdout = result.stdout.trim();
  return stdout ? JSON.parse(stdout) : null;
}

module.exports = { reconcile };
