'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { slugify, normalizeSearchValue, ensureString, ensureStringArray, escapeRegExp } = require('./utils');
const { parseTaskFile, buildTaskMarkdown } = require('./frontmatter');

const VALID_TASK_STATUSES = new Set(['open', 'implemented', 'needs-rework', 'done']);
const activeTasksByEcosystem = new Map();

function listTasks(ecosystem, filters = {}) {
  if (!fs.existsSync(ecosystem.tasksDir)) return [];

  let tasks = fs
    .readdirSync(ecosystem.tasksDir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => parseTaskFile(path.join(ecosystem.tasksDir, f)));

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

function getNextTaskFileNumber(ecosystem) {
  const tasks = listTasks(ecosystem);
  const numbers = tasks.map((t) => getTaskFileNumber(t.fileName)).filter(Number.isInteger);
  return numbers.length ? Math.max(...numbers) + 1 : tasks.length + 1;
}

function buildTaskFileName(ecosystem, id) {
  const number = String(getNextTaskFileNumber(ecosystem)).padStart(2, '0');
  return `${number}-${id.replace(/^\d+-/, '')}.md`;
}

function resolveTask(ecosystem, reference) {
  const wanted = ensureString(reference, 'task');
  const normalized = normalizeSearchValue(wanted);
  const tasks = listTasks(ecosystem);

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
  throw new Error(`Task "${wanted}" was not found in ecosystem "${ecosystem.directoryName}".`);
}

function summarizeTask(task) {
  const { body, ...summary } = task;
  return summary;
}

function rememberActiveTasks(ecosystemName, taskIds, reason) {
  const current = activeTasksByEcosystem.get(ecosystemName) || [];
  const seen = new Set(current.map((i) => i.id));
  const timestamp = new Date().toISOString();
  for (const taskId of taskIds) {
    if (!seen.has(taskId)) {
      current.push({ id: taskId, reason, rememberedAt: timestamp });
      seen.add(taskId);
    }
  }
  activeTasksByEcosystem.set(ecosystemName, current);
}

function getActiveTasks(ecosystemName) {
  return activeTasksByEcosystem.get(ecosystemName) || [];
}

function buildTaskStatusEntry(status, task, number) {
  if (number) return `${number}. \`${status}\` \`${task.id}\`\n${' '.repeat(String(number).length + 2)}${task.title}`;
  return `- \`${status}\` \`${task.id}\`\n  ${task.title}`;
}

function updateTaskStatusInReadme(ecosystem, task, status) {
  const readmePath = path.join(ecosystem.sddRoot, 'README.md');
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

function createTask(args, getEcosystem) {
  const ecosystem = getEcosystem(args.ecosystem);
  const title = ensureString(args.title, 'title');
  const id = slugify(args.id || title);
  const scope = slugify(args.scope || id);
  const repositories = ensureStringArray(args.repositories, 'repositories', true);
  const body = ensureString(args.body, 'body');
  const knownRepos = new Set(ecosystem.repositories.map((r) => r.id));
  const unknown = repositories.filter((r) => !knownRepos.has(r));
  if (unknown.length) throw new Error(`Unknown repositories: ${unknown.join(', ')}`);

  fs.mkdirSync(ecosystem.tasksDir, { recursive: true });
  const taskPath = path.join(ecosystem.tasksDir, buildTaskFileName(ecosystem, id));
  if (fs.existsSync(taskPath)) throw new Error(`Task "${id}" already exists.`);

  const task = {
    id, title, scope, status: 'open', repositories,
    validation: ensureStringArray(args.validation, 'validation'),
    docsTargets: ensureStringArray(args.docsTargets || args.docs_targets, 'docsTargets'),
    dependsOn: ensureStringArray(args.dependsOn || args.depends_on, 'dependsOn'),
    body,
  };

  fs.writeFileSync(taskPath, buildTaskMarkdown(task));
  const parsedTask = parseTaskFile(taskPath);
  updateTaskStatusInReadme(ecosystem, parsedTask, 'open');
  rememberActiveTasks(ecosystem.directoryName, [parsedTask.id], 'created-by-mcp');
  return { ecosystem: ecosystem.directoryName, task: parsedTask };
}

function setTaskStatus(args, getEcosystem) {
  const ecosystem = getEcosystem(args.ecosystem);
  const status = ensureString(args.status, 'status').toLowerCase();
  if (!VALID_TASK_STATUSES.has(status)) throw new Error(`Unsupported status "${status}".`);
  if (status === 'done' && args.userValidated !== true) throw new Error('Refusing to mark done without userValidated: true.');

  const task = resolveTask(ecosystem, args.task);
  const content = fs.readFileSync(task.filePath, 'utf8');
  const updated = content.replace(/^status:\s+.*$/m, `status: ${status}`);
  if (updated === content) throw new Error(`Task "${task.id}" has no status line to update.`);

  fs.writeFileSync(task.filePath, updated);
  const updatedTask = parseTaskFile(task.filePath);
  const readme = updateTaskStatusInReadme(ecosystem, task, status);
  rememberActiveTasks(ecosystem.directoryName, [updatedTask.id], `status-${status}`);
  return { ecosystem: ecosystem.directoryName, task: updatedTask, readme };
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
  updateTaskStatusInReadme,
};
