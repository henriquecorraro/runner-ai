#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const ROOT = path.resolve(__dirname, '..');
const VALID_TASK_STATUSES = new Set(['open', 'implemented', 'needs-rework', 'done']);
const activeTasksByEcosystem = new Map();

function jsonResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function jsonError(id, code, message, data = undefined) {
  return { jsonrpc: '2.0', id, error: { code, message, ...(data === undefined ? {} : { data }) } };
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeSearchValue(value) {
  return String(value)
    .toLowerCase()
    .replace(/\.md$/, '')
    .replace(/^\d+-/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function ensureString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Field "${fieldName}" is required.`);
  }

  return value.trim();
}

function ensureStringArray(value, fieldName, required = false) {
  if (value === undefined || value === null) {
    if (required) {
      throw new Error(`Field "${fieldName}" is required.`);
    }

    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`Field "${fieldName}" must be an array.`);
  }

  const items = value.map((item) => ensureString(item, fieldName));

  if (required && items.length === 0) {
    throw new Error(`Field "${fieldName}" must contain at least one item.`);
  }

  return items;
}

function parseScalar(rawValue) {
  const value = rawValue.trim();

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    if (value.startsWith('"')) {
      try {
        return JSON.parse(value);
      } catch {
        return value.slice(1, -1);
      }
    }

    return value.slice(1, -1);
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return value;
}

function parseFrontmatter(frontmatter) {
  const result = {};
  let currentArrayKey = null;

  for (const rawLine of frontmatter.split('\n')) {
    const line = rawLine.replace(/\r$/, '');

    if (line.trim().length === 0) {
      continue;
    }

    const arrayItemMatch = line.match(/^\s*-\s+(.*)$/);
    if (arrayItemMatch) {
      if (!currentArrayKey) {
        throw new Error(`Invalid frontmatter array item without key: "${line}"`);
      }

      result[currentArrayKey].push(parseScalar(arrayItemMatch[1]));
      continue;
    }

    const keyMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!keyMatch) {
      throw new Error(`Unsupported frontmatter line: "${line}"`);
    }

    const [, key, rawValue] = keyMatch;
    if (rawValue.trim().length === 0) {
      result[key] = [];
      currentArrayKey = key;
      continue;
    }

    result[key] = parseScalar(rawValue);
    currentArrayKey = null;
  }

  return result;
}

function formatScalar(value) {
  const stringValue = String(value);

  if (/^[A-Za-z0-9_.:/ -]+$/.test(stringValue)) {
    return stringValue;
  }

  return JSON.stringify(stringValue);
}

function formatArray(key, values) {
  if (!values.length) {
    return [];
  }

  return [`${key}:`, ...values.map((value) => `  - ${formatScalar(value)}`)];
}

function parseTaskFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!match) {
    throw new Error(`Task file must start with YAML frontmatter: ${filePath}`);
  }

  const metadata = parseFrontmatter(match[1]);
  const fileName = path.basename(filePath);
  const id = String(metadata.id || fileName.replace(/\.md$/, ''));
  const status = String(metadata.status || 'open').toLowerCase();

  return {
    id,
    title: String(metadata.title || id),
    scope: metadata.scope ? String(metadata.scope) : null,
    status,
    repositories: Array.isArray(metadata.repositories) ? metadata.repositories.map(String) : [],
    validation: Array.isArray(metadata.validation) ? metadata.validation.map(String) : [],
    docsTargets: Array.isArray(metadata.docs_targets) ? metadata.docs_targets.map(String) : [],
    dependsOn: Array.isArray(metadata.depends_on) ? metadata.depends_on.map(String) : [],
    body: match[2].trim(),
    fileName,
    filePath,
    relativePath: fileName,
  };
}

function buildTaskMarkdown(task) {
  return [
    '---',
    `id: ${formatScalar(task.id)}`,
    `title: ${formatScalar(task.title)}`,
    `scope: ${formatScalar(task.scope)}`,
    `status: ${formatScalar(task.status)}`,
    ...formatArray('repositories', task.repositories),
    ...formatArray('validation', task.validation),
    ...formatArray('docs_targets', task.docsTargets),
    ...formatArray('depends_on', task.dependsOn),
    '---',
    '',
    task.body.trim(),
    '',
  ].join('\n');
}

function listEcosystems() {
  const ecosystemsRoot = path.join(ROOT, 'ecosystems');

  if (!fs.existsSync(ecosystemsRoot)) {
    return [];
  }

  return fs
    .readdirSync(ecosystemsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const ecosystemDir = path.join(ecosystemsRoot, entry.name);
      const configPath = path.join(ecosystemDir, 'ecosystem.config.json');

      if (!fs.existsSync(configPath)) {
        return null;
      }

      const config = readJson(configPath);
      return describeEcosystem(entry.name, config, ecosystemDir, configPath);
    })
    .filter(Boolean);
}

function describeEcosystem(directoryName, config, ecosystemDir, configPath) {
  const sddRoot = path.resolve(ecosystemDir, config.sddRoot || 'sdd');
  const tasksDir = path.join(sddRoot, 'tasks');
  const historyRoot = path.resolve(ecosystemDir, config.historyRoot || 'runs');

  return {
    name: config.name || directoryName,
    directoryName,
    configPath,
    ecosystemDir,
    sddRoot,
    tasksDir,
    historyRoot,
    defaultAgent: config.defaultAgent || 'codex',
    repositories: Array.isArray(config.repositories)
      ? config.repositories.map((repository) => ({
          id: repository.id,
          label: repository.label || repository.id,
          root: path.resolve(ecosystemDir, repository.path),
          validation: Array.isArray(repository.validation) ? repository.validation : [],
          docsHints: Array.isArray(repository.docsHints) ? repository.docsHints : [],
        }))
      : [],
  };
}

function getEcosystem(name) {
  const wanted = ensureString(name, 'ecosystem');
  const ecosystem = listEcosystems().find(
    (candidate) => candidate.directoryName === wanted || candidate.name === wanted,
  );

  if (!ecosystem) {
    throw new Error(`Ecosystem "${wanted}" was not found.`);
  }

  return ecosystem;
}

function listTasks(ecosystem, filters = {}) {
  if (!fs.existsSync(ecosystem.tasksDir)) {
    return [];
  }

  let tasks = fs
    .readdirSync(ecosystem.tasksDir)
    .filter((fileName) => fileName.endsWith('.md'))
    .sort()
    .map((fileName) => parseTaskFile(path.join(ecosystem.tasksDir, fileName)));

  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status.map(String) : [String(filters.status)];
    tasks = tasks.filter((task) => statuses.includes(task.status));
  }

  if (filters.scope) {
    tasks = tasks.filter((task) => task.scope === filters.scope);
  }

  return tasks;
}

function getTaskFileNumber(fileName) {
  const match = fileName.match(/^(\d+)-/);
  return match ? Number(match[1]) : null;
}

function stripTaskFileNumber(id) {
  return String(id).replace(/^\d+-/, '');
}

function getNextTaskFileNumber(ecosystem) {
  const tasks = listTasks(ecosystem);
  const numbers = tasks
    .map((task) => getTaskFileNumber(task.fileName))
    .filter((number) => Number.isInteger(number));

  if (numbers.length) {
    return Math.max(...numbers) + 1;
  }

  return tasks.length + 1;
}

function buildTaskFileName(ecosystem, id) {
  const number = String(getNextTaskFileNumber(ecosystem)).padStart(2, '0');
  return `${number}-${stripTaskFileNumber(id)}.md`;
}

function summarizeTask(task) {
  const { body, ...summary } = task;
  return summary;
}

function resolveTask(ecosystem, reference) {
  const wanted = ensureString(reference, 'task');
  const normalized = normalizeSearchValue(wanted);
  const tasks = listTasks(ecosystem);

  const exact = tasks.find(
    (task) =>
      task.id === wanted ||
      task.fileName === wanted ||
      normalizeSearchValue(task.id) === normalized ||
      normalizeSearchValue(task.fileName) === normalized,
  );

  if (exact) {
    return exact;
  }

  const matches = tasks.filter(
    (task) =>
      normalizeSearchValue(task.id).includes(normalized) ||
      normalizeSearchValue(task.fileName).includes(normalized),
  );

  if (matches.length === 1) {
    return matches[0];
  }

  if (matches.length > 1) {
    throw new Error(`Task reference "${wanted}" matched multiple tasks: ${matches.map((task) => task.id).join(', ')}`);
  }

  throw new Error(`Task "${wanted}" was not found in ecosystem "${ecosystem.directoryName}".`);
}

function rememberActiveTasks(ecosystemName, taskIds, reason) {
  const current = activeTasksByEcosystem.get(ecosystemName) || [];
  const seen = new Set(current.map((item) => item.id));
  const timestamp = new Date().toISOString();

  for (const taskId of taskIds) {
    if (!seen.has(taskId)) {
      current.push({ id: taskId, reason, rememberedAt: timestamp });
      seen.add(taskId);
    }
  }

  activeTasksByEcosystem.set(ecosystemName, current);
}

function updateTaskStatusInReadme(ecosystem, task, status) {
  const readmePath = path.join(ecosystem.sddRoot, 'README.md');

  if (!fs.existsSync(readmePath)) {
    return { updated: false, reason: 'README.md not found' };
  }

  const content = fs.readFileSync(readmePath, 'utf8');
  const knownStatuses = [...VALID_TASK_STATUSES].map(escapeRegExp).join('|');
  const statusLinePattern = new RegExp(`((?:-|\\d+\\.)\\s+\`)(?:${knownStatuses})(\`\\s+\`${escapeRegExp(task.id)}\`)`);

  if (statusLinePattern.test(content)) {
    fs.writeFileSync(readmePath, content.replace(statusLinePattern, `$1${status}$2`));
    return { updated: true, path: readmePath };
  }

  const header = '## Task Status\n';
  const headerIndex = content.indexOf(header);

  if (headerIndex !== -1) {
    const sectionStart = headerIndex + header.length;
    const nextSectionMatch = content.slice(sectionStart).match(/\n##\s/);
    const sectionEnd = nextSectionMatch ? sectionStart + nextSectionMatch.index : content.length;
    const sectionBody = content.slice(sectionStart, sectionEnd);
    const normalizedBody = sectionBody.replace(/^\s*-\s+No tasks yet\s*$/m, '').trim();
    const numberedMatches = [...sectionBody.matchAll(/^(\d+)\.\s+`/gm)];
    const nextNumber = numberedMatches.length
      ? Math.max(...numberedMatches.map((match) => Number(match[1]))) + 1
      : null;
    const entry = buildTaskStatusEntry(status, task, nextNumber);
    const updatedBody = normalizedBody ? `\n${normalizedBody}\n\n${entry}\n` : `\n${entry}\n`;

    fs.writeFileSync(
      readmePath,
      `${content.slice(0, sectionStart)}${updatedBody}${content.slice(sectionEnd)}`,
    );
    return { updated: true, path: readmePath };
  }

  return { updated: false, reason: 'Task Status section not found' };
}

function buildTaskStatusEntry(status, task, number) {
  if (number) {
    return `${number}. \`${status}\` \`${task.id}\`\n${' '.repeat(String(number).length + 2)}${task.title}`;
  }

  return `- \`${status}\` \`${task.id}\`\n  ${task.title}`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createTask(args) {
  const ecosystem = getEcosystem(args.ecosystem);
  const title = ensureString(args.title, 'title');
  const id = slugify(args.id || title);
  const scope = slugify(args.scope || id);
  const repositories = ensureStringArray(args.repositories, 'repositories', true);
  const body = ensureString(args.body, 'body');
  const knownRepositories = new Set(ecosystem.repositories.map((repository) => repository.id));
  const unknownRepositories = repositories.filter((repository) => !knownRepositories.has(repository));

  if (unknownRepositories.length) {
    throw new Error(`Unknown repositories: ${unknownRepositories.join(', ')}`);
  }

  fs.mkdirSync(ecosystem.tasksDir, { recursive: true });
  const taskPath = path.join(ecosystem.tasksDir, buildTaskFileName(ecosystem, id));

  if (fs.existsSync(taskPath)) {
    throw new Error(`Task "${id}" already exists.`);
  }

  const task = {
    id,
    title,
    scope,
    status: 'open',
    repositories,
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

function setTaskStatus(args) {
  const ecosystem = getEcosystem(args.ecosystem);
  const status = ensureString(args.status, 'status').toLowerCase();

  if (!VALID_TASK_STATUSES.has(status)) {
    throw new Error(`Unsupported status "${status}".`);
  }

  if (status === 'done' && args.userValidated !== true) {
    throw new Error('Refusing to mark done without userValidated: true.');
  }

  const task = resolveTask(ecosystem, args.task);
  const content = fs.readFileSync(task.filePath, 'utf8');
  const updated = content.replace(/^status:\s+.*$/m, `status: ${status}`);

  if (updated === content) {
    throw new Error(`Task "${task.id}" has no status line to update.`);
  }

  fs.writeFileSync(task.filePath, updated);
  const updatedTask = parseTaskFile(task.filePath);
  const readme = updateTaskStatusInReadme(ecosystem, task, status);
  rememberActiveTasks(ecosystem.directoryName, [updatedTask.id], `status-${status}`);

  return { ecosystem: ecosystem.directoryName, task: updatedTask, readme };
}

function runWithRunner(args) {
  const ecosystem = getEcosystem(args.ecosystem);

  if (args.userConfirmedRunner !== true) {
    throw new Error('Runner execution requires userConfirmedRunner: true.');
  }

  const selection = ensureString(args.selection, 'selection');
  const dryRun = args.dryRun !== false;
  const commandArgs = ['run', 'tasks', '--', '--config', ecosystem.configPath];

  if (selection === 'task') {
    commandArgs.push('--task', ensureString(args.value, 'value'));
  } else if (selection === 'scope') {
    commandArgs.push('--scope', ensureString(args.value, 'value'));
  } else if (selection === 'feature') {
    commandArgs.push('--feature', ensureString(args.value, 'value'));
  } else if (selection === 'open-tasks') {
    commandArgs.push('--open-tasks');
  } else if (selection === 'open-scopes') {
    commandArgs.push('--open-scopes');
  } else {
    throw new Error('Field "selection" must be one of: task, scope, feature, open-tasks, open-scopes.');
  }

  if (args.agent) {
    commandArgs.push('--agent', ensureString(args.agent, 'agent'));
  }

  if (dryRun) {
    commandArgs.push('--dry-run');
  }

  const result = spawnSync('npm', commandArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10,
  });

  return {
    command: `npm ${commandArgs.join(' ')}`,
    exitCode: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    dryRun,
  };
}

function getOperatingContext(args) {
  const ecosystem = args.ecosystem ? getEcosystem(args.ecosystem) : null;
  const sharedSkillsDir = path.join(ROOT, 'skills');
  const sharedSkills = fs
    .readdirSync(sharedSkillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(sharedSkillsDir, entry.name, 'SKILL.md')))
    .map((entry) => ({
      name: entry.name,
      path: path.join(sharedSkillsDir, entry.name, 'SKILL.md'),
    }));

  return {
    repositoryRoot: ROOT,
    currentChatDefault: true,
    runnerRequiresExplicitUserChoice: true,
    contextualTaskReferencesUseCurrentConversationFirst: true,
    guidance: [
      'Use the current chat/agent for task execution by default to reuse context and save tokens.',
      'Resolve "as tasks", "essas tasks", and "pode fazer" against tasks created, changed, or discussed in this conversation before listing all open tasks.',
      'Use the runner only when the user explicitly asks for runner execution or confirms it for a large scope/open-task batch.',
      'Do not mark tasks done until the user confirms validation.',
    ],
    sharedSkills,
    ecosystem,
    activeTasks: ecosystem ? activeTasksByEcosystem.get(ecosystem.directoryName) || [] : [],
  };
}

const tools = [
  {
    name: 'get_operating_context',
    description:
      'Return the ecosystem-ai-runner operating rules. Use this before planning or executing ecosystem tasks; current-chat execution is the default.',
    inputSchema: {
      type: 'object',
      properties: {
        ecosystem: { type: 'string', description: 'Optional ecosystem name or directory name.' },
      },
    },
  },
  {
    name: 'list_ecosystems',
    description: 'List configured ecosystems and their repositories.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_tasks',
    description: 'List centralized tasks for one ecosystem, optionally filtered by status or scope.',
    inputSchema: {
      type: 'object',
      required: ['ecosystem'],
      properties: {
        ecosystem: { type: 'string' },
        status: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
        scope: { type: 'string' },
      },
    },
  },
  {
    name: 'get_task',
    description: 'Load one task for execution in the current chat/agent.',
    inputSchema: {
      type: 'object',
      required: ['ecosystem', 'task'],
      properties: {
        ecosystem: { type: 'string' },
        task: { type: 'string', description: 'Task id, filename, or unique fragment.' },
      },
    },
  },
  {
    name: 'get_active_tasks',
    description: 'Return task ids remembered as active in this MCP session for contextual references like "essas tasks".',
    inputSchema: {
      type: 'object',
      required: ['ecosystem'],
      properties: { ecosystem: { type: 'string' } },
    },
  },
  {
    name: 'remember_active_tasks',
    description: 'Remember task ids from the current conversation so later references like "pode fazer as tasks" resolve locally.',
    inputSchema: {
      type: 'object',
      required: ['ecosystem', 'tasks'],
      properties: {
        ecosystem: { type: 'string' },
        tasks: { type: 'array', items: { type: 'string' } },
        reason: { type: 'string' },
      },
    },
  },
  {
    name: 'create_task',
    description: 'Create a centralized task file and remember it as active for the current conversation.',
    inputSchema: {
      type: 'object',
      required: ['ecosystem', 'title', 'repositories', 'body'],
      properties: {
        ecosystem: { type: 'string' },
        id: { type: 'string' },
        title: { type: 'string' },
        scope: { type: 'string' },
        repositories: { type: 'array', items: { type: 'string' } },
        validation: { type: 'array', items: { type: 'string' } },
        docsTargets: { type: 'array', items: { type: 'string' } },
        dependsOn: { type: 'array', items: { type: 'string' } },
        body: { type: 'string' },
      },
    },
  },
  {
    name: 'set_task_status',
    description: 'Update a task status. Requires userValidated: true for done.',
    inputSchema: {
      type: 'object',
      required: ['ecosystem', 'task', 'status'],
      properties: {
        ecosystem: { type: 'string' },
        task: { type: 'string' },
        status: { type: 'string', enum: [...VALID_TASK_STATUSES] },
        userValidated: { type: 'boolean' },
      },
    },
  },
  {
    name: 'run_with_runner',
    description:
      'Run the isolated ecosystem runner. Use only after explicit user choice; dryRun defaults to true.',
    inputSchema: {
      type: 'object',
      required: ['ecosystem', 'selection', 'userConfirmedRunner'],
      properties: {
        ecosystem: { type: 'string' },
        selection: { type: 'string', enum: ['task', 'scope', 'feature', 'open-tasks', 'open-scopes'] },
        value: { type: 'string', description: 'Task id, scope id, or feature fragment when required.' },
        agent: { type: 'string' },
        dryRun: { type: 'boolean' },
        userConfirmedRunner: { type: 'boolean' },
      },
    },
  },
];

function callTool(name, args = {}) {
  if (name === 'get_operating_context') {
    return getOperatingContext(args);
  }

  if (name === 'list_ecosystems') {
    return { ecosystems: listEcosystems() };
  }

  if (name === 'list_tasks') {
    const ecosystem = getEcosystem(args.ecosystem);
    return { ecosystem: ecosystem.directoryName, tasks: listTasks(ecosystem, args).map(summarizeTask) };
  }

  if (name === 'get_task') {
    const ecosystem = getEcosystem(args.ecosystem);
    const task = resolveTask(ecosystem, args.task);
    rememberActiveTasks(ecosystem.directoryName, [task.id], 'loaded-by-mcp');
    return { ecosystem: ecosystem.directoryName, task };
  }

  if (name === 'get_active_tasks') {
    const ecosystem = getEcosystem(args.ecosystem);
    return { ecosystem: ecosystem.directoryName, activeTasks: activeTasksByEcosystem.get(ecosystem.directoryName) || [] };
  }

  if (name === 'remember_active_tasks') {
    const ecosystem = getEcosystem(args.ecosystem);
    const taskIds = ensureStringArray(args.tasks, 'tasks', true);
    const resolvedTasks = taskIds.map((taskId) => resolveTask(ecosystem, taskId));
    rememberActiveTasks(ecosystem.directoryName, resolvedTasks.map((task) => task.id), args.reason || 'remembered-by-agent');
    return { ecosystem: ecosystem.directoryName, activeTasks: activeTasksByEcosystem.get(ecosystem.directoryName) || [] };
  }

  if (name === 'create_task') {
    return createTask(args);
  }

  if (name === 'set_task_status') {
    return setTaskStatus(args);
  }

  if (name === 'run_with_runner') {
    return runWithRunner(args);
  }

  throw new Error(`Unknown tool: ${name}`);
}

function toolContent(value) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

async function handleMessage(message) {
  if (message.method === 'initialize') {
    return jsonResult(message.id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'ecosystem-ai-runner', version: '0.1.0' },
    });
  }

  if (message.method === 'notifications/initialized') {
    return null;
  }

  if (message.method === 'tools/list') {
    return jsonResult(message.id, { tools });
  }

  if (message.method === 'tools/call') {
    const { name, arguments: args } = message.params || {};
    const result = callTool(name, args || {});
    return jsonResult(message.id, toolContent(result));
  }

  return jsonError(message.id, -32601, `Method not found: ${message.method}`);
}

const rl = readline.createInterface({ input: process.stdin });

rl.on('line', async (line) => {
  if (!line.trim()) {
    return;
  }

  let message;

  try {
    message = JSON.parse(line);
  } catch (error) {
    send(jsonError(null, -32700, 'Parse error', error.message));
    return;
  }

  try {
    const response = await handleMessage(message);
    if (response) {
      send(response);
    }
  } catch (error) {
    send(jsonError(message.id, -32000, error.message));
  }
});
