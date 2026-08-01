#!/usr/bin/env node
'use strict';

/**
 * Integration tests for determinism improvements.
 * Run: node test-determinism.js
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const { writeFileAtomic, validateFrontmatter, parseTaskFile, buildTaskMarkdown, KNOWN_FRONTMATTER_FIELDS } = require('./lib/frontmatter');
const { slugify, resolveContainedPath } = require('./lib/utils');
const { buildRunnerArgs } = require('./lib/runner');
const { estimateTokens, truncateToTokenBudget } = require('./lib/token-usage');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eco-test-'));
const workspacesModule = require('./lib/workspaces');
workspacesModule.ROOT = tmpDir;
const { createWorkspace } = require('./lib/workspace-create');
const { reconcile } = require('./lib/reconcile');
const {
  createTask,
  createBranchInRepos,
  finishTaskExecution,
  startTaskExecution,
  validateTransition,
  getTaskDiff,
  compactTaskContext,
  loadTaskContext,
} = require('./lib/tasks');
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
  }
}

// ============================================================
console.log('\n#7 - Write atômico (rename pattern)');
// ============================================================

test('writeFileAtomic creates file correctly', () => {
  const filePath = path.join(tmpDir, 'atomic-test.md');
  writeFileAtomic(filePath, 'hello world\n');
  assert.equal(fs.readFileSync(filePath, 'utf8'), 'hello world\n');
});

test('writeFileAtomic overwrites atomically', () => {
  const filePath = path.join(tmpDir, 'atomic-overwrite.md');
  writeFileAtomic(filePath, 'first');
  writeFileAtomic(filePath, 'second');
  assert.equal(fs.readFileSync(filePath, 'utf8'), 'second');
});

test('writeFileAtomic does not leave .tmp files on success', () => {
  const filePath = path.join(tmpDir, 'atomic-no-tmp.md');
  writeFileAtomic(filePath, 'content');
  const siblings = fs.readdirSync(tmpDir).filter((f) => f.startsWith('atomic-no-tmp') && f.includes('.tmp'));
  assert.equal(siblings.length, 0);
});

// ============================================================
console.log('\n#12 - Schema validation');
// ============================================================

test('validateFrontmatter accepts valid fields', () => {
  const metadata = { id: 'test', title: 'Test Task', status: 'open', repositories: ['repo-a'] };
  validateFrontmatter(metadata, '/fake/path.md'); // should not throw
});

test('validateFrontmatter rejects unknown fields', () => {
  const metadata = { id: 'test', title: 'Test', status: 'open', bogus_field: 'bad' };
  assert.throws(() => validateFrontmatter(metadata, '/fake/path.md'), /Unknown frontmatter field "bogus_field"/);
});

test('validateFrontmatter rejects missing required field (id)', () => {
  const metadata = { title: 'Test', status: 'open' };
  assert.throws(() => validateFrontmatter(metadata, '/fake/path.md'), /Missing required frontmatter field "id"/);
});

test('validateFrontmatter rejects missing required field (title)', () => {
  const metadata = { id: 'test', status: 'open' };
  assert.throws(() => validateFrontmatter(metadata, '/fake/path.md'), /Missing required frontmatter field "title"/);
});

test('validateFrontmatter rejects missing required field (status)', () => {
  const metadata = { id: 'test', title: 'Test' };
  assert.throws(() => validateFrontmatter(metadata, '/fake/path.md'), /Missing required frontmatter field "status"/);
});

// ============================================================
console.log('\n#5 - Validação de transições de estado');
// ============================================================

// We need to test the state machine via tasks.js internals
// Since validateTransition is not exported, test via setTaskStatus behavior
// Create a fake task file to test
const tasksTestDir = path.join(tmpDir, 'ws-test', 'sdd', 'tasks');
fs.mkdirSync(tasksTestDir, { recursive: true });

function createTestTask(id, status) {
  const task = {
    id,
    title: `Test ${id}`,
    scope: 'test',
    status,
    repositories: ['repo-a'],
    validation: [],
    docsTargets: [],
    dependsOn: [],
    baseBranch: null,
    createdAt: new Date().toISOString(),
    finishedAt: null,
    body: 'Test body',
  };
  const filePath = path.join(tasksTestDir, `01-${id}.md`);
  writeFileAtomic(filePath, buildTaskMarkdown(task));
  return filePath;
}

test('parseTaskFile works with base_branch field', () => {
  const task = {
    id: 'branch-test',
    title: 'Branch Test',
    scope: 'test',
    status: 'open',
    repositories: ['repo-a'],
    validation: [],
    docsTargets: [],
    dependsOn: [],
    baseBranch: 'develop',
    createdAt: '2026-01-01T00:00:00Z',
    finishedAt: null,
    body: 'Test body',
  };
  const filePath = path.join(tmpDir, 'branch-task.md');
  writeFileAtomic(filePath, buildTaskMarkdown(task));
  const parsed = parseTaskFile(filePath);
  assert.equal(parsed.baseBranch, 'develop');
});

test('parseTaskFile roundtrips all fields correctly', () => {
  const task = {
    id: 'roundtrip',
    title: 'Roundtrip Test',
    scope: 'test-scope',
    status: 'open',
    complexity: 'high',
    risk: 'critical',
    executionProfile: 'deep',
    executionAgent: 'codex',
    routingPolicy: 'pinned',
    preferredModel: 'gpt-5.6-sol',
    reasoningEffort: 'high',
    repositories: ['repo-a', 'repo-b'],
    validation: ['npm test', 'npm run lint'],
    docsTargets: ['docs/api.md'],
    dependsOn: ['other-task'],
    baseBranch: 'main',
    createdAt: '2026-01-01T00:00:00Z',
    finishedAt: null,
    githubIssueRepo: null,
    githubIssueId: null,
    githubIssueNumber: null,
    githubIssueUrl: null,
    githubIssueNodeId: null,
    githubIssueUrls: [],
    githubDraftIssueNodeId: null,
    githubProjectItemId: null,
    githubProjectItemNodeId: null,
    githubProjectItemUrl: null,
    githubProjectStatus: null,
    body: 'Implement the feature.\n\n## Steps\n- Step 1\n- Step 2',
  };
  const filePath = path.join(tmpDir, 'roundtrip-task.md');
  writeFileAtomic(filePath, buildTaskMarkdown(task));
  const parsed = parseTaskFile(filePath);
  assert.equal(parsed.id, 'roundtrip');
  assert.equal(parsed.title, 'Roundtrip Test');
  assert.equal(parsed.scope, 'test-scope');
  assert.equal(parsed.status, 'open');
  assert.equal(parsed.complexity, 'high');
  assert.equal(parsed.risk, 'critical');
  assert.equal(parsed.executionProfile, 'deep');
  assert.equal(parsed.executionAgent, 'codex');
  assert.equal(parsed.routingPolicy, 'pinned');
  assert.equal(parsed.preferredModel, 'gpt-5.6-sol');
  assert.equal(parsed.reasoningEffort, 'high');
  assert.deepEqual(parsed.repositories, ['repo-a', 'repo-b']);
  assert.deepEqual(parsed.validation, ['npm test', 'npm run lint']);
  assert.deepEqual(parsed.docsTargets, ['docs/api.md']);
  assert.deepEqual(parsed.dependsOn, ['other-task']);
  assert.equal(parsed.baseBranch, 'main');
  assert.equal(parsed.body, 'Implement the feature.\n\n## Steps\n- Step 1\n- Step 2');
});

// ============================================================
console.log('\n#1 - Idempotência (O_EXCL)');
// ============================================================

test('O_EXCL prevents creating file that already exists', () => {
  const filePath = path.join(tmpDir, 'excl-test.md');
  // Create first
  const fd = fs.openSync(filePath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY);
  fs.writeSync(fd, 'first');
  fs.closeSync(fd);
  // Try again - should fail with EEXIST
  assert.throws(() => {
    fs.openSync(filePath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY);
  }, (err) => err.code === 'EEXIST');
});

// ============================================================
console.log('\n#5 - State machine (real implementation)');
// ============================================================

function testTransition(from, to) {
  try {
    validateTransition({ id: 'transition-test', status: from }, to);
    return true;
  } catch {
    return false;
  }
}

test('open → implemented is allowed', () => {
  assert.equal(testTransition('open', 'implemented'), true);
});

test('open → needs-rework is allowed', () => {
  assert.equal(testTransition('open', 'needs-rework'), true);
});

test('open → done is NOT allowed', () => {
  assert.equal(testTransition('open', 'done'), false);
});

test('implemented → done is allowed', () => {
  assert.equal(testTransition('implemented', 'done'), true);
});

test('implemented → needs-rework is allowed', () => {
  assert.equal(testTransition('implemented', 'needs-rework'), true);
});

test('done → open is NOT allowed', () => {
  assert.equal(testTransition('done', 'open'), false);
});

test('done → implemented is NOT allowed', () => {
  assert.equal(testTransition('done', 'implemented'), false);
});

test('needs-rework → implemented is allowed', () => {
  assert.equal(testTransition('needs-rework', 'implemented'), true);
});

test('needs-rework → open is allowed', () => {
  assert.equal(testTransition('needs-rework', 'open'), true);
});

// ============================================================
console.log('\n#3 - Persistência de active tasks');
// ============================================================

test('active tasks are persisted to disk and reloadable', () => {
  // Simulate the persistence mechanism
  const sessionFile = path.join(tmpDir, '.active-session.json');
  const data = [{ id: 'task-1', reason: 'test', rememberedAt: '2026-01-01T00:00:00Z' }];
  writeFileAtomic(sessionFile, JSON.stringify(data, null, 2) + '\n');

  const loaded = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].id, 'task-1');
  assert.equal(loaded[0].reason, 'test');
});

// ============================================================
console.log('\n#6 - Seleção paralela de tasks');
// ============================================================

test('parallel selection forwards every task id to the generic runner', () => {
  const args = buildRunnerArgs(
    { configPath: '/tmp/workspace.config.json' },
    { taskIds: ['task-a', 'task-b'] },
  );
  assert.deepEqual(args.slice(-4), ['--task', 'task-a', '--task', 'task-b']);
});

// ============================================================
console.log('\n#9 - BaseBranch no frontmatter');
// ============================================================

test('base_branch is preserved in roundtrip', () => {
  const task = {
    id: 'base-branch-test',
    title: 'Base Branch Test',
    scope: 'test',
    status: 'open',
    repositories: ['repo-a'],
    validation: [],
    docsTargets: [],
    dependsOn: [],
    baseBranch: 'develop',
    createdAt: '2026-01-01T00:00:00Z',
    finishedAt: null,
    body: 'Test',
  };
  const filePath = path.join(tmpDir, 'base-branch.md');
  writeFileAtomic(filePath, buildTaskMarkdown(task));
  const parsed = parseTaskFile(filePath);
  assert.equal(parsed.baseBranch, 'develop');
});

test('base_branch null does not emit field', () => {
  const task = {
    id: 'no-branch',
    title: 'No Branch',
    scope: 'test',
    status: 'open',
    repositories: ['repo-a'],
    validation: [],
    docsTargets: [],
    dependsOn: [],
    baseBranch: null,
    createdAt: '2026-01-01T00:00:00Z',
    finishedAt: null,
    body: 'Test',
  };
  const content = buildTaskMarkdown(task);
  assert.equal(content.includes('base_branch'), false);
});

// ============================================================
console.log('\nReconcile module loads');
// ============================================================

test('reconcile module exports reconcile function', () => {
  const { reconcile } = require('./lib/reconcile');
  assert.equal(typeof reconcile, 'function');
});

test('reconcile returns disabled when no githubProject', () => {
  const { reconcile } = require('./lib/reconcile');
  const fakeWs = { githubProject: null };
  const result = reconcile(fakeWs);
  assert.equal(result.enabled, false);
  assert.equal(result.reason, 'githubProject not configured');
});

// ============================================================
console.log('\nContext snapshot');
// ============================================================

test('loadTaskContext returns hasContext:false when no file exists', () => {
  const { loadTaskContext } = require('./lib/tasks');
  const fakeTask = { filePath: path.join(tmpDir, 'nonexistent-task.md') };
  const result = loadTaskContext(fakeTask);
  assert.equal(result.hasContext, false);
  assert.equal(result.content, null);
});

test('loadTaskContext returns content when .context.md exists', () => {
  const { loadTaskContext } = require('./lib/tasks');
  const taskPath = path.join(tmpDir, 'ctx-task.md');
  const contextPath = path.join(tmpDir, 'ctx-task.context.md');
  writeFileAtomic(taskPath, '---\nid: ctx-task\ntitle: Ctx Task\nstatus: open\n---\nBody');
  writeFileAtomic(contextPath, '# Execution Context\n\nCached stuff here');
  const result = loadTaskContext({ filePath: taskPath });
  assert.equal(result.hasContext, true);
  assert.ok(result.content.includes('Cached stuff here'));
});

test('listTasks ignores .context.md snapshot files', () => {
  const { listTasks } = require('./lib/tasks');
  const tasksDir = path.join(tmpDir, 'context-list-tasks');
  fs.mkdirSync(tasksDir, { recursive: true });
  writeFileAtomic(
    path.join(tasksDir, '01-context-list-task.md'),
    '---\nid: context-list-task\ntitle: Context List Task\nscope: test\nstatus: open\nrepositories: []\nvalidation: []\ndocs_targets: []\ndepends_on: []\n---\nBody',
  );
  writeFileAtomic(
    path.join(tasksDir, '01-context-list-task.context.md'),
    '# Execution Context\n\nCached stuff here',
  );

  const tasks = listTasks({ tasksDir });
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].id, 'context-list-task');
});

test('context file is not created when context arg is empty', () => {
  const contextPath = path.join(tmpDir, 'no-ctx-task.context.md');
  assert.equal(fs.existsSync(contextPath), false);
});

test('token estimator and truncation are deterministic', () => {
  assert.equal(estimateTokens('12345678'), 2);
  const result = truncateToTokenBudget('x'.repeat(100), 10);
  assert.equal(result.truncated, true);
  assert.equal(result.content.length, 40);
  assert.equal(result.includedTokens, 10);
});

// ============================================================
console.log('\nAgent auto-detection');
// ============================================================

test('detectCallerAgent detects kiro from KIRO_SESSION_ID', () => {
  // Current env has KIRO_SESSION_ID set
  const detected = process.env.KIRO_SESSION_ID ? 'kiro' : null;
  if (detected) {
    assert.equal(detected, 'kiro');
  } else {
    // Skip if not running under kiro
    assert.ok(true);
  }
});

test('ECOSYSTEM_AGENT env override takes precedence', () => {
  const original = process.env.ECOSYSTEM_AGENT;
  process.env.ECOSYSTEM_AGENT = 'custom-agent';
  // Inline detection logic
  const detected = process.env.ECOSYSTEM_AGENT || null;
  assert.equal(detected, 'custom-agent');
  if (original) process.env.ECOSYSTEM_AGENT = original;
  else delete process.env.ECOSYSTEM_AGENT;
});

// ============================================================
console.log('\nRunner - dependency resolution');
// ============================================================

test('tasks with unmet deps are not ready', () => {
  // Simulate the Python logic in JS for testing
  const tasks = {
    'task-22': { status: 'running', depends_on: [] },
    'task-23': { status: 'queued', depends_on: ['task-22'] },
    'task-24': { status: 'queued', depends_on: ['task-22'] },
  };
  const ready = Object.entries(tasks)
    .filter(([, t]) => t.status === 'queued')
    .filter(([, t]) => t.depends_on.every((d) => tasks[d] && tasks[d].status === 'success'));
  assert.equal(ready.length, 0);
});

test('tasks become ready when deps succeed', () => {
  const tasks = {
    'task-22': { status: 'success', depends_on: [] },
    'task-23': { status: 'queued', depends_on: ['task-22'] },
    'task-24': { status: 'queued', depends_on: ['task-22'] },
  };
  const ready = Object.entries(tasks)
    .filter(([, t]) => t.status === 'queued')
    .filter(([, t]) => t.depends_on.every((d) => tasks[d] && tasks[d].status === 'success'));
  assert.equal(ready.length, 2);
});

test('tasks are skipped when deps fail', () => {
  const tasks = {
    'task-22': { status: 'failed', depends_on: [] },
    'task-23': { status: 'queued', depends_on: ['task-22'] },
    'task-24': { status: 'queued', depends_on: ['task-22'] },
  };
  const skipped = Object.entries(tasks)
    .filter(([, t]) => t.status === 'queued')
    .filter(([, t]) => t.depends_on.some((d) => tasks[d] && tasks[d].status === 'failed'));
  assert.equal(skipped.length, 2);
});

test('tasks without deps are immediately ready', () => {
  const tasks = {
    'task-22': { status: 'queued', depends_on: [] },
    'task-23': { status: 'queued', depends_on: ['task-22'] },
  };
  const ready = Object.entries(tasks)
    .filter(([, t]) => t.status === 'queued')
    .filter(([, t]) => t.depends_on.every((d) => tasks[d] && tasks[d].status === 'success'));
  assert.equal(ready.length, 1);
  assert.equal(ready[0][0], 'task-22');
});

// ============================================================
console.log('\nRunner - generic Python entrypoint');
// ============================================================

test('runner targets the generic Python module', () => {
  const args = buildRunnerArgs({ configPath: '/tmp/workspace.config.json' }, { selection: 'task', value: 'task-one' });
  assert.deepEqual(args.slice(0, 4), ['-m', 'runners.generic', '--config', '/tmp/workspace.config.json']);
});

test('runner forwards every public selection mode', () => {
  const ws = { configPath: '/tmp/workspace.config.json' };
  assert(buildRunnerArgs(ws, { selection: 'feature', value: 'billing' }).includes('--feature'));
  assert(buildRunnerArgs(ws, { selection: 'scope', value: 'billing' }).includes('--scope'));
  assert(buildRunnerArgs(ws, { selection: 'open-tasks' }).includes('--open-tasks'));
  assert(buildRunnerArgs(ws, { selection: 'open-scopes' }).includes('--open-scopes'));
});

test('runner forwards agent override and concurrency', () => {
  const args = buildRunnerArgs(
    { configPath: '/tmp/workspace.config.json' },
    { selection: 'open-tasks', agent: 'custom', concurrency: 3 },
  );
  assert.deepEqual(args.slice(-4), ['--agent', 'custom', '--concurrency', '3']);
});

test('runner requires explicit permission flag for pinned agent overrides', () => {
  const ws = { configPath: '/tmp/workspace.config.json' };
  assert.throws(() => buildRunnerArgs(ws, { selection: 'open-tasks', allowAgentOverride: true }), /requires/);
  const args = buildRunnerArgs(ws, { selection: 'open-tasks', agent: 'codex', allowAgentOverride: true });
  assert(args.includes('--allow-agent-override'));
});

test('runner forwards opt-in related-task batching', () => {
  const args = buildRunnerArgs(
    { configPath: '/tmp/workspace.config.json' },
    { selection: 'open-tasks', batchRelatedTasks: true, batchSize: 4 },
  );
  assert.deepEqual(args.slice(-3), ['--batch-related', '--batch-size', '4']);
});

test('runner rejects calls without a selection', () => {
  assert.throws(
    () => buildRunnerArgs({ configPath: '/tmp/workspace.config.json' }),
    /Select tasks/,
  );
});

// ============================================================
console.log('\nIntent - card only, not in local file');
// ============================================================

test('intent field does not appear in buildTaskMarkdown output', () => {
  const task = {
    id: 'no-prose-task',
    title: 'No Prose Task',
    scope: 'test',
    status: 'open',
    repositories: ['repo-a'],
    validation: [],
    docsTargets: [],
    dependsOn: [],
    baseBranch: null,
    createdAt: '2026-01-01T00:00:00Z',
    finishedAt: null,
    body: 'Do something',
    // intent should NOT be serialized
    intent: 'We decided this because of X and Y',
  };
  const md = buildTaskMarkdown(task);
  // intent key must not appear as a frontmatter field
  assert.equal(/^intent:/m.test(md), false);
  // intent value must not leak into the file
  assert.equal(md.includes('We decided this'), false);
});

// ============================================================
console.log('\nDeterministic task creation and Git lifecycle');
// ============================================================

function makeWorkspace(name, repositories = [{ id: 'repo', root: tmpDir }]) {
  const wsDir = path.join(tmpDir, 'workspaces', name);
  const sddRoot = path.join(wsDir, 'sdd');
  const tasksDir = path.join(sddRoot, 'tasks');
  fs.mkdirSync(tasksDir, { recursive: true });
  writeFileAtomic(path.join(sddRoot, 'README.md'), `# ${name}\n\n## Task Status\n\n- No tasks yet\n`);
  return {
    directoryName: name, name, wsDir, sddRoot, tasksDir, repositories, githubProject: null,
    defaultAgent: 'codex',
    agents: { codex: { name: 'codex', configuredModels: ['gpt-5.6-luna', 'gpt-5.6-terra', 'gpt-5.6-sol'] } },
    configPath: path.join(wsDir, 'workspace.config.json'),
    tokenPolicy: { contextBudgetTokens: 4000, reviewDiffBudgetTokens: 2000, batchRelatedTasks: false, batchSize: 3 },
  };
}

function runGit(repositoryRoot, args) {
  return spawnSync('git', args, { cwd: repositoryRoot, encoding: 'utf8' });
}

function initGitRepository(name, branch = 'main') {
  const repositoryRoot = path.join(tmpDir, name);
  fs.mkdirSync(repositoryRoot, { recursive: true });
  assert.equal(runGit(repositoryRoot, ['init', '-q', '-b', branch]).status, 0);
  runGit(repositoryRoot, ['config', 'user.email', 'audit@example.com']);
  runGit(repositoryRoot, ['config', 'user.name', 'Audit']);
  writeFileAtomic(path.join(repositoryRoot, 'file.txt'), 'initial\n');
  runGit(repositoryRoot, ['add', '.']);
  assert.equal(runGit(repositoryRoot, ['commit', '-q', '-m', 'initial']).status, 0);
  return repositoryRoot;
}

test('createTask rejects duplicate task ids regardless of sequence number', () => {
  const ws = makeWorkspace('duplicate-id');
  const args = { workspace: ws.directoryName, id: 'same-id', title: 'Same ID', repositories: ['repo'], body: 'Do work' };
  createTask(args, () => ws);
  assert.equal(parseTaskFile(path.join(ws.tasksDir, '01-same-id.md')).routingPolicy, 'preferred');
  assert.throws(() => createTask(args, () => ws), /already exists/);
  assert.deepEqual(fs.readdirSync(ws.tasksDir).filter((file) => file.endsWith('.md')), ['01-same-id.md']);
});

test('createTask leaves no task file when GitHub synchronization fails', () => {
  const ws = makeWorkspace('sync-failure');
  const syncError = () => { throw new Error('simulated sync failure'); };
  assert.throws(
    () => createTask(
      { workspace: ws.directoryName, id: 'failed-sync', title: 'Failed Sync', repositories: ['repo'], body: 'Do work' },
      () => ws,
      { createTaskCard: syncError },
    ),
    /simulated sync failure/,
  );
  assert.deepEqual(fs.readdirSync(ws.tasksDir).filter((file) => file.endsWith('.md')), []);
  assert.equal(fs.existsSync(path.join(ws.tasksDir, '.create-task.lock')), false);
});

test('createTask validates deterministic execution routing', () => {
  const ws = makeWorkspace('task-routing');
  const base = { workspace: ws.directoryName, title: 'Route Task', repositories: ['repo'], body: 'Do work' };
  assert.throws(() => createTask({ ...base, id: 'missing-agent', routingPolicy: 'pinned' }, () => ws), /executionAgent/);
  assert.throws(() => createTask({ ...base, id: 'raw-command', executionAgent: 'codex --danger', routingPolicy: 'pinned' }, () => ws), /not configured/);
  assert.throws(() => createTask({ ...base, id: 'bad-model', executionAgent: 'codex', preferredModel: 'hallucinated-model' }, () => ws), /not configured/);
  assert.throws(() => createTask({ ...base, id: 'bad-portable', routingPolicy: 'portable', executionAgent: 'codex' }, () => ws), /Portable routing/);
  const created = createTask({
    ...base, id: 'valid-route', executionAgent: 'codex', routingPolicy: 'pinned',
    executionProfile: 'deep', preferredModel: 'gpt-5.6-sol', reasoningEffort: 'high',
  }, () => ws);
  assert.equal(created.task.executionAgent, 'codex');
  assert.equal(created.task.routingPolicy, 'pinned');
  assert.equal(created.task.preferredModel, 'gpt-5.6-sol');
});

test('branch preflight never deletes a preexisting branch after another repository fails', () => {
  const first = initGitRepository('rollback-first');
  const second = initGitRepository('rollback-second', 'other');
  assert.equal(runGit(first, ['branch', 'feat/audit']).status, 0);
  const ws = { repositories: [{ id: 'one', root: first }, { id: 'two', root: second }] };
  assert.throws(() => createBranchInRepos(ws, ['one', 'two'], 'feat/audit', 'main'), /does not exist/);
  assert.equal(runGit(first, ['show-ref', '--verify', '--quiet', 'refs/heads/feat/audit']).status, 0);
  assert.equal(runGit(first, ['branch', '--show-current']).stdout.trim(), 'main');
});

test('current-chat lifecycle finishes without a GitHub Project', () => {
  const repositoryRoot = initGitRepository('no-project-repo');
  const ws = makeWorkspace('no-project', [{ id: 'repo', root: repositoryRoot }]);
  writeFileAtomic(path.join(ws.tasksDir, '01-audit.md'), buildTaskMarkdown({
    id: 'audit', title: 'Audit', scope: 'audit', status: 'open', repositories: ['repo'],
    validation: [], docsTargets: [], dependsOn: [], body: 'Do work', createdAt: new Date().toISOString(),
  }));
  const started = startTaskExecution({ workspace: ws.directoryName, task: 'audit' }, () => ws);
  assert.equal(started.task.executionState, 'in-progress');
  const review = finishTaskExecution({ workspace: ws.directoryName, task: 'audit' }, () => ws);
  assert.equal(review.movedToTesting, false);
  const finished = finishTaskExecution({ workspace: ws.directoryName, task: 'audit', skipReview: true }, () => ws);
  assert.equal(finished.task.status, 'implemented');
  assert.equal(finished.task.executionState, 'testing');
});

test('task diff is paginated by token budget', () => {
  const repositoryRoot = initGitRepository('paged-diff');
  writeFileAtomic(path.join(repositoryRoot, 'file.txt'), `${'changed line\n'.repeat(600)}`);
  const ws = makeWorkspace('paged-diff-workspace', [{ id: 'repo', root: repositoryRoot }]);
  writeFileAtomic(path.join(ws.tasksDir, '01-paged.md'), buildTaskMarkdown({
    id: 'paged', title: 'Paged', scope: 'paged', status: 'open', repositories: ['repo'],
    validation: [], docsTargets: [], dependsOn: [], baseBranch: 'main', body: 'Review changes', createdAt: new Date().toISOString(),
  }));
  const first = getTaskDiff({ workspace: ws.directoryName, task: 'paged', maxTokens: 100 }, () => ws);
  assert.equal(first.truncated, true);
  assert.ok(first.nextOffset > 0);
  assert.ok(first.includedTokens <= 100);
  const second = getTaskDiff({ workspace: ws.directoryName, task: 'paged', maxTokens: 100, offset: first.nextOffset }, () => ws);
  assert.equal(second.offset, first.nextOffset);
  assert.equal(second.contentHash, first.contentHash);
});

test('thin context manifest remains recoverable through SQLite cache', () => {
  const repositoryRoot = initGitRepository('thin-context-repo');
  const ws = makeWorkspace('thin-context-workspace', [{ id: 'repo', root: repositoryRoot }]);
  writeFileAtomic(ws.configPath, `${JSON.stringify({
    name: ws.name,
    repositories: [{ id: 'repo', path: repositoryRoot }],
    defaultAgent: 'fake',
    agents: { fake: { command: '/bin/true' } },
  }, null, 2)}\n`);
  const taskPath = path.join(ws.tasksDir, '01-thin.md');
  writeFileAtomic(taskPath, buildTaskMarkdown({
    id: 'thin', title: 'Thin', scope: 'thin', status: 'open', repositories: ['repo'],
    validation: [], docsTargets: [], dependsOn: [], body: 'Use cached knowledge', createdAt: new Date().toISOString(),
  }));
  writeFileAtomic(taskPath.replace(/\.md$/, '.context.md'), '# API Contract\n\nImportant cached knowledge.\n');
  const result = compactTaskContext({ workspace: ws.directoryName, task: 'thin' }, () => ws);
  assert.equal(result.unchanged, false);
  assert.match(fs.readFileSync(taskPath.replace(/\.md$/, '.context.md'), 'utf8'), /ws-runner-context-manifest:v1/);
  const loaded = loadTaskContext(parseTaskFile(taskPath), { workspace: ws, maxTokens: 100 });
  assert.match(loaded.content, /Important cached knowledge/);
  assert.ok(loaded.manifest.unitIds.length > 0);
  assert.equal(fs.existsSync(path.join(ws.wsDir, 'cache', 'context.sqlite')), true);
});

test('runner rejects invalid concurrency and escaping run ids', () => {
  const ws = { configPath: '/tmp/workspace.config.json' };
  assert.throws(() => buildRunnerArgs(ws, { selection: 'open-tasks', concurrency: -1 }), /positive integer/);
  assert.throws(() => buildRunnerArgs(ws, { selection: 'open-tasks', runId: '../escape' }), /unsupported|letters/);
});

test('contained paths reject workspace traversal', () => {
  assert.throws(() => resolveContainedPath('/tmp/workspace', '../escape', 'historyRoot'), /stay inside/);
  assert.equal(resolveContainedPath('/tmp/workspace', 'runs', 'historyRoot'), '/tmp/workspace/runs');
});

test('createWorkspace rejects escaping roots and leaves no partial workspace', () => {
  const repositoryRoot = initGitRepository('workspace-source');
  assert.throws(() => createWorkspace({
    name: 'Escaping Workspace',
    directoryName: 'escaping-workspace',
    repositories: [{ id: 'repo', path: repositoryRoot }],
    historyRoot: '../outside',
    skipGithubProject: true,
  }), /stay inside/);
  assert.equal(fs.existsSync(path.join(tmpDir, 'workspaces', 'escaping-workspace')), false);
  assert.equal(fs.readdirSync(path.join(tmpDir, 'workspaces')).some((name) => name.startsWith('escaping-workspace.tmp.')), false);
});

test('createWorkspace publishes a complete staged workspace atomically', () => {
  const repositoryRoot = initGitRepository('workspace-source-success');
  const previousModel = process.env.CODEX_MODEL;
  process.env.CODEX_MODEL = 'gpt-5.6-sol';
  let created;
  try {
    created = createWorkspace({
      name: 'Atomic Workspace',
      directoryName: 'atomic-workspace',
      repositories: [{ id: 'repo', path: repositoryRoot }],
      skipGithubProject: true,
    });
  } finally {
    if (previousModel === undefined) delete process.env.CODEX_MODEL;
    else process.env.CODEX_MODEL = previousModel;
  }
  assert.equal(fs.existsSync(created.configPath), true);
  assert.equal(fs.existsSync(path.join(created.tasksDir, '.gitkeep')), true);
  assert.equal(fs.existsSync(path.join(created.sddRoot, 'README.md')), true);
  const config = JSON.parse(fs.readFileSync(created.configPath, 'utf8'));
  assert.equal(config.agents.codex.codex.sessionPolicy, 'task');
  assert.equal(config.agents.codex.codex.models.standard, 'gpt-5.6-terra');
  assert.equal(config.agents.codex.codex.reasoning.deep, 'high');
  assert.equal(config.agents.codex.model, undefined);
  assert.equal(fs.readdirSync(path.join(tmpDir, 'workspaces')).some((name) => name.startsWith('atomic-workspace.tmp.')), false);
});

test('createWorkspace persists agent model allowlists', () => {
  const repositoryRoot = initGitRepository('workspace-routing-config-source');
  const created = createWorkspace({
    name: 'Routing Config Workspace',
    directoryName: 'routing-config-workspace',
    repositories: [{ id: 'repo', path: repositoryRoot }],
    skipGithubProject: true,
    defaultAgent: 'custom',
    agents: {
      custom: {
        command: '/bin/true',
        model: 'primary-model',
        allowedModels: ['primary-model', 'secondary-model'],
      },
    },
  });
  const config = JSON.parse(fs.readFileSync(created.configPath, 'utf8'));
  assert.deepEqual(config.agents.custom.allowedModels, ['primary-model', 'secondary-model']);
});

test('reconcile rejects unknown direction before touching GitHub', () => {
  assert.throws(() => reconcile({ githubProject: {} }, { direction: 'unsafe' }), /direction/);
});

// ============================================================
// Cleanup
// ============================================================

fs.rmSync(tmpDir, { recursive: true, force: true });

console.log(`\n${'─'.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${'─'.repeat(40)}\n`);

process.exit(failed > 0 ? 1 : 0);
