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
const { parseTaskFile, buildTaskMarkdown, writeFileAtomic } = require('./frontmatter');
const { listTasks } = require('./tasks');
const { BOARD_STATUS } = require('./github-sync');

// Maps local status → expected board status
const STATUS_TO_BOARD = {
  open: BOARD_STATUS.todo,
  'needs-rework': BOARD_STATUS.todo,
  implemented: BOARD_STATUS.testing,
  done: BOARD_STATUS.done,
};

// Maps board status → local status (for GitHub→local sync)
const BOARD_TO_STATUS = {
  [BOARD_STATUS.todo]: null, // ambiguous: could be open or needs-rework, don't override
  [BOARD_STATUS.inProgress]: null, // transient, don't override
  [BOARD_STATUS.testing]: 'implemented',
  [BOARD_STATUS.done]: 'done',
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

  if (!ws.githubProject) {
    return { enabled: false, reason: 'githubProject not configured', drifts: [] };
  }

  const tasks = listTasks(ws).filter((t) => t.githubProjectItemId);
  if (!tasks.length) {
    return { enabled: true, drifts: [], checked: 0, fixed: 0 };
  }

  const drifts = [];
  const fixes = [];

  for (const task of tasks) {
    const drift = detectDrift(ws, task);
    if (drift) {
      drifts.push(drift);
      if (!dryRun) {
        const fix = applyFix(ws, task, drift, direction);
        if (fix) fixes.push(fix);
      }
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

  for (const issue of drift.issues) {
    if (issue.type === 'frontmatter-status-stale') {
      // Always fix: update local frontmatter to reflect actual GitHub state
      const updatedTask = { ...task, githubProjectStatus: issue.github };
      writeFileAtomic(task.filePath, buildTaskMarkdown(updatedTask));
      applied.push({ type: 'update-local-frontmatter', field: 'github_project_status', value: issue.github });
    }

    if (issue.type === 'board-status-mismatch' && (direction === 'both' || direction === 'local-to-github')) {
      // Local wins: push local status to GitHub board
      const targetStatus = STATUS_TO_BOARD[task.status];
      if (targetStatus) {
        try {
          moveCardToStatus(ws, task, targetStatus);
          applied.push({ type: 'push-board-status', from: issue.github.boardStatus, to: targetStatus });
        } catch (err) {
          applied.push({ type: 'push-board-status-failed', error: err.message });
        }
      }
    }

    if (issue.type === 'issue-closed-externally' && (direction === 'both' || direction === 'github-to-local')) {
      // GitHub wins: mark local as done (but only update frontmatter status field, not trigger full close)
      const targetLocalStatus = BOARD_TO_STATUS[BOARD_STATUS.done];
      if (targetLocalStatus) {
        const updatedTask = { ...task, status: targetLocalStatus, githubProjectStatus: BOARD_STATUS.done, finishedAt: new Date().toISOString() };
        writeFileAtomic(task.filePath, buildTaskMarkdown(updatedTask));
        applied.push({ type: 'pull-closed-status', from: task.status, to: targetLocalStatus });
      }
    }

    if (issue.type === 'issue-open-but-task-done' && (direction === 'both' || direction === 'local-to-github')) {
      // Local wins: close the issue
      try {
        closeGitHubIssue(task);
        applied.push({ type: 'close-github-issue', issueUrl: task.githubIssueUrl });
      } catch (err) {
        applied.push({ type: 'close-github-issue-failed', error: err.message });
      }
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

  try {
    const endpoint = `${projectEndpoint(ws.githubProject, `items/${task.githubProjectItemId}`)}`;
    const item = ghApi('GET', endpoint);
    if (!item) return null;

    let boardStatus = null;
    if (item.fields) {
      for (const field of item.fields) {
        if (field.name && field.name.toLowerCase() === 'status' && field.value) {
          boardStatus = typeof field.value === 'string' ? field.value : (field.value.name || field.value.raw || null);
          break;
        }
      }
    }

    // Also check issue state if we have the issue URL
    let issueState = null;
    if (task.githubIssueRepo && task.githubIssueNumber) {
      try {
        const issue = ghApi('GET', `/repos/${task.githubIssueRepo}/issues/${task.githubIssueNumber}`);
        issueState = issue.state;
      } catch { /* best effort */ }
    }

    return { boardStatus, issueState };
  } catch {
    return null;
  }
}

function moveCardToStatus(ws, task, statusName) {
  const { moveTaskCard } = require('./github-sync');
  moveTaskCard(ws, task, statusName);
}

function closeGitHubIssue(task) {
  if (!task.githubIssueRepo || !task.githubIssueNumber) return;
  ghApi('PATCH', `/repos/${task.githubIssueRepo}/issues/${task.githubIssueNumber}`, {
    state: 'closed',
    state_reason: 'completed',
  });
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

  const options = { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 };
  if (body !== null) {
    args.push('--input', '-');
    options.input = JSON.stringify(body);
  }

  const result = spawnSync('gh', args, options);
  if (result.status !== 0) {
    const output = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
    throw new Error(`GitHub API call failed (${method} ${endpoint}): ${output}`);
  }

  const stdout = result.stdout.trim();
  return stdout ? JSON.parse(stdout) : null;
}

module.exports = { reconcile };
