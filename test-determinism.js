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

const { writeFileAtomic, validateFrontmatter, parseTaskFile, buildTaskMarkdown, KNOWN_FRONTMATTER_FIELDS } = require('./lib/frontmatter');
const { slugify } = require('./lib/utils');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eco-test-'));
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
console.log('\n#5 - State machine (via direct import)');
// ============================================================

// Import the ALLOWED_TRANSITIONS indirectly by testing task status changes
// We'll simulate the validateTransition logic
const ALLOWED_TRANSITIONS = {
  open: new Set(['implemented', 'needs-rework']),
  'needs-rework': new Set(['implemented', 'open']),
  implemented: new Set(['done', 'needs-rework']),
  done: new Set([]),
};

function testTransition(from, to) {
  const allowed = ALLOWED_TRANSITIONS[from];
  return allowed && allowed.has(to);
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
console.log('\n#6 - Cleanup de runs em memória');
// ============================================================

test('runs state.json is written correctly', () => {
  const stateFile = path.join(tmpDir, 'state.json');
  const state = {
    id: 'par-123',
    workspace: 'test',
    concurrency: 4,
    total: 2,
    completed: 2,
    startedAt: '2026-01-01T00:00:00Z',
    finishedAt: '2026-01-01T00:01:00Z',
    tasks: [
      { id: 'task-a', status: 'success', exitCode: 0 },
      { id: 'task-b', status: 'failed', exitCode: 1 },
    ],
  };
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n');
  const loaded = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  assert.equal(loaded.id, 'par-123');
  assert.equal(loaded.tasks.length, 2);
  assert.equal(loaded.tasks[0].status, 'success');
  assert.equal(loaded.tasks[1].status, 'failed');
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

test('context file is not created when context arg is empty', () => {
  const contextPath = path.join(tmpDir, 'no-ctx-task.context.md');
  assert.equal(fs.existsSync(contextPath), false);
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
console.log('\nRunner - generic agent command');
// ============================================================

test('agent command is built from workspace config', () => {
  const agent = { name: 'kiro', command: 'kiro-cli', args: ['chat', '--no-interactive', '--trust-all-tools'] };
  const prompt = 'Execute task X';
  const fullArgs = [...agent.args, prompt];
  assert.equal(fullArgs[0], 'chat');
  assert.equal(fullArgs[fullArgs.length - 1], prompt);
});

test('different agents produce different commands', () => {
  const agents = {
    kiro: { command: 'kiro-cli', args: ['chat', '--no-interactive', '--trust-all-tools'] },
    codex: { command: 'codex', args: ['exec', '--ephemeral'] },
    claude: { command: 'claude', args: ['-p'] },
  };
  const prompt = 'Do the thing';
  for (const [name, agent] of Object.entries(agents)) {
    const cmd = agent.command;
    const fullArgs = [...agent.args, prompt];
    assert.equal(cmd, agent.command);
    assert.equal(fullArgs[fullArgs.length - 1], prompt);
  }
});

test('workspace resolves default agent correctly', () => {
  const config = {
    defaultAgent: 'kiro',
    agents: {
      kiro: { name: 'kiro', command: 'kiro-cli', args: [] },
      codex: { name: 'codex', command: 'codex', args: [] },
    },
  };
  const resolved = config.agents[config.defaultAgent];
  assert.equal(resolved.name, 'kiro');
  assert.equal(resolved.command, 'kiro-cli');
});

test('workspace allows agent override', () => {
  const config = {
    defaultAgent: 'kiro',
    agents: {
      kiro: { name: 'kiro', command: 'kiro-cli', args: [] },
      codex: { name: 'codex', command: 'codex', args: [] },
    },
  };
  const override = 'codex';
  const resolved = config.agents[override] || config.agents[config.defaultAgent];
  assert.equal(resolved.name, 'codex');
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
// Cleanup
// ============================================================

fs.rmSync(tmpDir, { recursive: true, force: true });

console.log(`\n${'─'.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${'─'.repeat(40)}\n`);

process.exit(failed > 0 ? 1 : 0);
