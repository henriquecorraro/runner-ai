#!/usr/bin/env node

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_CONFIG_FILE = 'ecosystem.config.json';
const ACTIONABLE_TASK_STATUSES = new Set(['open', 'needs-rework']);
const VALID_TASK_STATUSES = new Set(['open', 'implemented', 'needs-rework', 'done']);

function printHelp() {
  console.log(`Ecosystem AI Runner

Usage:
  ecosystem-ai-runner --config <path> --task <task-id-or-path>
  ecosystem-ai-runner --config <path> --feature <task-name-fragment>
  ecosystem-ai-runner --config <path> --scope <scope-id>
  ecosystem-ai-runner --config <path> --open-tasks
  ecosystem-ai-runner --config <path> --open-scopes

Options:
  --task <value>         Uses one central ecosystem task by id, filename, or relative path. Repeatable.
  --feature <value>      Resolves one central task by filename fragment.
  --scope <scope-id>     Executes every task in one scope within a shared agent session.
  --open-tasks           Executes every actionable task ("open" and "needs-rework") in one shared agent session.
  --open-scopes          Groups actionable tasks by scope and runs one shared agent session per scope.
  --config <path>        Uses a custom ecosystem config file. Default: ${DEFAULT_CONFIG_FILE}
  --agent <name>         Uses an agent from config.agents. Default: config.defaultAgent or codex.
  --run-id <value>       Uses a custom output run id. Default: timestamp.
  --dry-run              Resolves config and tasks without invoking an agent.
  --help                 Shows this message.
`);
}

function parseArgs(argv) {
  const options = {
    config: DEFAULT_CONFIG_FILE,
    dryRun: false,
    tasks: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--open-tasks') {
      options.openTasks = true;
      continue;
    }

    if (arg === '--open-scopes') {
      options.openScopes = true;
      continue;
    }

    if (arg === '--feature') {
      options.feature = readValue(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--scope') {
      options.scope = readValue(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--config') {
      options.config = readValue(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--agent') {
      options.agent = readValue(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--run-id') {
      options.runId = readValue(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--task') {
      options.tasks.push(readValue(argv, index, arg));
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function readValue(argv, index, name) {
  const value = argv[index + 1];

  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${name}.`);
  }

  return value;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createRunId() {
  return new Date()
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')
    .replace(/[:]/g, '-');
}

function normalizeSearchValue(value) {
  return value
    .toLowerCase()
    .replace(/\.md$/, '')
    .replace(/^\d+-/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function ensureArray(value, fieldName) {
  if (value == null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`Field "${fieldName}" must be an array when provided.`);
  }

  return value;
}

function assertReadableFile(filePath, label) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`${label} does not exist: ${filePath}`);
  }
}

function loadJson(filePath, label) {
  assertReadableFile(filePath, label);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadConfig(configPath) {
  const absolutePath = path.resolve(process.cwd(), configPath);
  const config = loadJson(absolutePath, 'Ecosystem config');

  if (!config.name) {
    throw new Error('Config must define "name".');
  }

  if (!Array.isArray(config.repositories) || config.repositories.length === 0) {
    throw new Error('Config must define at least one repository.');
  }

  return {
    config,
    configPath: absolutePath,
    configDir: path.dirname(absolutePath),
  };
}

function resolveRepositories(configDir, repositories) {
  const resolved = repositories.map((repository) => {
    if (!repository.id) {
      throw new Error('Every repository entry must have an id.');
    }

    if (!repository.path) {
      throw new Error(`Repository "${repository.id}" must have a path.`);
    }

    const root = path.resolve(configDir, repository.path);

    if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
      throw new Error(`Repository "${repository.id}" path does not exist: ${root}`);
    }

    return {
      ...repository,
      root,
      label: repository.label || repository.id,
      docsHints: ensureArray(repository.docsHints, `repositories.${repository.id}.docsHints`),
      validation: ensureArray(repository.validation, `repositories.${repository.id}.validation`),
    };
  });

  return {
    list: resolved,
    byId: new Map(resolved.map((repository) => [repository.id, repository])),
  };
}

function parseScalar(rawValue) {
  const value = rawValue.trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
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

function parseTaskFile(taskFilePath, repositoriesById) {
  const content = fs.readFileSync(taskFilePath, 'utf8');
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!match) {
    throw new Error(`Task file must start with YAML frontmatter: ${taskFilePath}`);
  }

  const metadata = parseFrontmatter(match[1]);
  const body = match[2].trim();
  const fileName = path.basename(taskFilePath);
  const fileStem = fileName.replace(/\.md$/, '');
  const id = metadata.id || fileStem;
  const title = metadata.title || fileStem;
  const scope = metadata.scope || null;
  const status = String(metadata.status || 'open').toLowerCase();
  const repositoryIds = ensureArray(metadata.repositories, `task ${id}.repositories`);

  if (!VALID_TASK_STATUSES.has(status)) {
    throw new Error(
      `Task "${id}" has unsupported status "${status}". ` +
        `Use one of: ${[...VALID_TASK_STATUSES].join(', ')}.`,
    );
  }

  if (repositoryIds.length === 0) {
    throw new Error(`Task "${id}" must define at least one repository in frontmatter.`);
  }

  for (const repositoryId of repositoryIds) {
    if (!repositoriesById.has(repositoryId)) {
      throw new Error(`Task "${id}" references unknown repository "${repositoryId}".`);
    }
  }

  return {
    id,
    title,
    scope,
    status,
    body,
    fileName,
    filePath: taskFilePath,
    relativePath: fileName,
    repositories: repositoryIds,
    validation: ensureArray(metadata.validation, `task ${id}.validation`),
    docsTargets: ensureArray(metadata.docs_targets, `task ${id}.docs_targets`),
    dependsOn: ensureArray(metadata.depends_on, `task ${id}.depends_on`),
  };
}

function loadTasks({ tasksDir, repositoriesById }) {
  if (!fs.existsSync(tasksDir) || !fs.statSync(tasksDir).isDirectory()) {
    throw new Error(`Task directory does not exist: ${tasksDir}`);
  }

  const tasks = fs
    .readdirSync(tasksDir)
    .filter((fileName) => fileName.endsWith('.md'))
    .sort()
    .map((fileName) => parseTaskFile(path.join(tasksDir, fileName), repositoriesById));

  if (tasks.length === 0) {
    throw new Error(`No task files found in ${tasksDir}.`);
  }

  const byId = new Map();

  for (const task of tasks) {
    if (byId.has(task.id)) {
      throw new Error(`Duplicate task id "${task.id}" in ${tasksDir}.`);
    }

    byId.set(task.id, task);
  }

  return {
    list: tasks,
    byId,
  };
}

function resolveTaskReference(taskReference, taskIndex) {
  const normalizedReference = taskReference.replaceAll(path.sep, '/');

  if (taskIndex.byId.has(normalizedReference)) {
    return taskIndex.byId.get(normalizedReference);
  }

  const byPath = taskIndex.list.filter(
    (task) =>
      task.relativePath === normalizedReference ||
      task.fileName === normalizedReference ||
      task.id === normalizedReference,
  );

  if (byPath.length === 1) {
    return byPath[0];
  }

  if (byPath.length > 1) {
    throw new Error(`Task reference "${taskReference}" is ambiguous.`);
  }

  throw new Error(`Task "${taskReference}" was not found in the ecosystem task directory.`);
}

function resolveFeatureTask(feature, taskIndex) {
  const normalizedFeature = normalizeSearchValue(feature);
  const matches = taskIndex.list.filter((task) => {
    const haystacks = [task.id, task.fileName, task.title];
    return haystacks.some((value) => normalizeSearchValue(value).includes(normalizedFeature));
  });

  if (matches.length === 0) {
    throw new Error(`Feature "${feature}" did not match any central ecosystem task.`);
  }

  if (matches.length > 1) {
    throw new Error(
      `Feature "${feature}" matched multiple tasks: ${matches.map((task) => task.fileName).join(', ')}.`,
    );
  }

  return matches[0];
}

function groupTasksByRepository(tasks, repositoriesById) {
  const grouped = [];
  const seen = new Set();

  for (const task of tasks) {
    for (const repositoryId of task.repositories) {
      if (!seen.has(repositoryId)) {
        grouped.push({
          repository: repositoriesById.get(repositoryId),
          tasks: [],
        });
        seen.add(repositoryId);
      }

      grouped.find((entry) => entry.repository.id === repositoryId).tasks.push(task);
    }
  }

  return grouped;
}

function createStageHistory({ historyRoot, runId, batchIndex, batchId, agentName }) {
  const stageName = `${String(batchIndex + 1).padStart(2, '0')}-${slugify(batchId)}`;
  const stageDir = path.join(historyRoot, runId, stageName);
  const logName = `${slugify(agentName || 'agent') || 'agent'}.log`;

  return {
    stageDir,
    promptFile: path.join(stageDir, 'prompt.md'),
    outputFile: path.join(stageDir, 'output.md'),
    logFile: path.join(stageDir, logName),
    metadataFile: path.join(stageDir, 'metadata.json'),
    summaryFile: path.join(stageDir, 'summary.json'),
    tasksDir: path.join(stageDir, 'tasks'),
  };
}

function buildRepositoryGuidance(repository) {
  const lines = [];

  if (repository.docsHints.length > 0) {
    lines.push(`- Docs hints: ${repository.docsHints.join('; ')}`);
  }

  if (repository.validation.length > 0) {
    lines.push(`- Default validation: ${repository.validation.join(' ; ')}`);
  }

  if (lines.length === 0) {
    lines.push('- Follow the repository local docs and validation scripts.');
  }

  return lines;
}

function buildSharedPrompt({ ecosystemName, batch, repositoriesById, outputFile }) {
  const repositories = groupTasksByRepository(batch.tasks, repositoriesById);
  const repositorySections = repositories.map(({ repository, tasks }) => {
    const taskSections = tasks
      .map((task) => {
        const metadataLines = [
          `Task id: ${task.id}`,
          `Task title: ${task.title}`,
          `Task file: ${task.relativePath}`,
          `Task status: ${task.status}`,
        ];

        if (task.scope) {
          metadataLines.push(`Task scope: ${task.scope}`);
        }

        if (task.docsTargets.length > 0) {
          metadataLines.push(`Docs targets: ${task.docsTargets.join(', ')}`);
        }

        if (task.validation.length > 0) {
          metadataLines.push(`Task validation: ${task.validation.join(' ; ')}`);
        }

        return [
          `### ${task.id}`,
          ...metadataLines,
          '',
          '```md',
          task.body,
          '```',
        ].join('\n');
      })
      .join('\n\n');

    return [
      `## ${repository.id}`,
      `Repository label: ${repository.label}`,
      `Repository root: ${repository.root}`,
      '',
      'Repository guidance:',
      ...buildRepositoryGuidance(repository),
      '',
      'Mandatory tasks for this repository in the current batch:',
      ...tasks.map((task) => `- ${task.id}: ${task.title}`),
      '',
      taskSections,
    ].join('\n');
  });

  return [
    'You are running one shared Ecosystem AI Runner stage for a centralized ecosystem SDD.',
    '',
    `Ecosystem: ${ecosystemName}`,
    `Batch id: ${batch.id}`,
    `Batch label: ${batch.label}`,
    '',
    'Execution goals:',
    '- Execute every task listed below in the same agent session.',
    '- Use the task repository ownership to decide where to edit code.',
    '- Keep cross-repository contract changes aligned across all affected repositories.',
    '- Keep execution summaries short and operational to control token cost.',
    '- Update repo docs only when the implementation is stable enough to describe the real module behavior.',
    '- If the result is partial or needs another pass, record gaps and rework instead of writing large final docs.',
    '- Do not revert unrelated user changes.',
    '- Run the narrowest useful validation in each touched repository.',
    '',
    'Repositories and tasks in this batch:',
    '',
    ...repositorySections,
    '',
    'Mandatory output file:',
    outputFile,
    '',
    'Before finishing, create that output file with this Markdown contract:',
    '',
    '# Ecosystem AI Runner Output',
    '',
    '- Status: success | blocked | failed',
    '- Mode: centralized-ecosystem',
    `- Batch: ${batch.id}`,
    '- Repositories:',
    '- Tasks:',
    '- Result:',
    '- Validation:',
    '- Docs Updated:',
    '- Gaps:',
    '- Needs Rework:',
    '- Notes:',
    '',
    'The output file must stay short and operational. After writing it, read it back before ending your response.',
  ].join('\n');
}

const AGENT_ADAPTERS = new Set(['codex', 'claude-code']);

function resolveAgentConfig(config, selectedAgentName = null) {
  const legacyCodexConfig = config.codex || {};
  const defaultAgents = {
    codex: {
      type: 'codex',
      command: legacyCodexConfig.command || 'codex',
      args:
        Array.isArray(legacyCodexConfig.args) && legacyCodexConfig.args.length > 0
          ? legacyCodexConfig.args
          : ['exec', '--ephemeral'],
    },
    'claude-code': {
      type: 'claude-code',
      command: 'claude',
      args: ['-p'],
    },
  };

  const configuredAgents = config.agents && typeof config.agents === 'object' ? config.agents : {};
  const agents = {
    ...defaultAgents,
    ...configuredAgents,
  };
  const name = selectedAgentName || config.defaultAgent || 'codex';
  const agent = agents[name];

  if (!agent) {
    throw new Error(`Agent "${name}" was not found in config.agents.`);
  }

  const type = agent.type || name;

  if (!AGENT_ADAPTERS.has(type)) {
    throw new Error(`Agent "${name}" uses unsupported adapter type "${type}". Supported: ${[...AGENT_ADAPTERS].join(', ')}.`);
  }

  return {
    name,
    type,
    command: agent.command || defaultAgents[type].command,
    args:
      Array.isArray(agent.args) && agent.args.length > 0
        ? agent.args
        : defaultAgents[type].args,
  };
}

function hasArg(args, ...names) {
  return args.some((arg) => names.includes(arg));
}

function buildAgentInvocation({ agent, stageHistory, cwd, writableRoots }) {
  const args = [...agent.args];

  for (const writableRoot of [stageHistory.stageDir, ...writableRoots]) {
    if (agent.type === 'codex' || agent.type === 'claude-code') {
      args.push('--add-dir', writableRoot);
    }
  }

  if (agent.type === 'codex') {
    args.push('-C', cwd, '-');
  }

  if (agent.type === 'claude-code') {
    if (!hasArg(args, '-p', '--print')) {
      args.unshift('-p');
    }

    args.push(
      `Read and execute the complete Ecosystem AI Runner prompt from ${stageHistory.promptFile}. Follow it exactly, including writing the mandatory output file.`,
    );
  }

  return {
    command: agent.command,
    args,
    cwd,
    stdin: agent.type === 'codex',
  };
}

function runAgent({ agent, prompt, stageHistory, cwd, writableRoots }) {
  const invocation = buildAgentInvocation({
    agent,
    stageHistory,
    cwd,
    writableRoots,
  });

  return new Promise((resolve, reject) => {
    const logStream = fs.createWriteStream(stageHistory.logFile, { flags: 'a' });
    const child = spawn(invocation.command, invocation.args, {
      cwd: invocation.cwd,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
      logStream.write(chunk);
    });

    child.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
      logStream.write(chunk);
    });

    child.on('error', (error) => {
      logStream.end();
      reject(error);
    });

    child.on('close', (code) => {
      logStream.end();
      resolve(code);
    });

    if (invocation.stdin) {
      child.stdin.end(prompt);
    } else {
      child.stdin.end();
    }
  });
}

function writeJson(filePath, value) {
  fs.writeFileSync(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(`${filePath}.tmp`, filePath);
}

function writeText(filePath, content) {
  fs.writeFileSync(`${filePath}.tmp`, content);
  fs.renameSync(`${filePath}.tmp`, filePath);
}

function snapshotBatchTasks(tasksDir, tasks) {
  fs.mkdirSync(tasksDir, { recursive: true });

  for (const task of tasks) {
    writeText(path.join(tasksDir, task.fileName), fs.readFileSync(task.filePath, 'utf8'));
  }
}

function readOutputFile(outputFile) {
  if (!fs.existsSync(outputFile) || !fs.statSync(outputFile).isFile()) {
    throw new Error(`Expected output file was not generated: ${outputFile}`);
  }

  const content = fs.readFileSync(outputFile, 'utf8');

  if (content.trim().length === 0) {
    throw new Error(`Expected output file is empty: ${outputFile}`);
  }

  return content;
}

function parseTokenUsage(logContent) {
  const usage = {
    totalTokens: null,
    inputTokens: null,
    outputTokens: null,
    cachedTokens: null,
    reasoningTokens: null,
  };

  const totalMatches = [...logContent.matchAll(/tokens used\s*\n([0-9][0-9,]*)/gi)];
  const totalMatch = totalMatches.at(-1);

  if (totalMatch) {
    usage.totalTokens = Number(totalMatch[1].replaceAll(',', ''));
  }

  const fieldPatterns = [
    ['inputTokens', /input tokens?\s*[:=]?\s*([0-9][0-9,]*)/gi],
    ['outputTokens', /output tokens?\s*[:=]?\s*([0-9][0-9,]*)/gi],
    ['cachedTokens', /cached tokens?\s*[:=]?\s*([0-9][0-9,]*)/gi],
    ['reasoningTokens', /reasoning tokens?\s*[:=]?\s*([0-9][0-9,]*)/gi],
  ];

  for (const [fieldName, pattern] of fieldPatterns) {
    const matches = [...logContent.matchAll(pattern)];
    const match = matches.at(-1);

    if (match) {
      usage[fieldName] = Number(match[1].replaceAll(',', ''));
    }
  }

  return usage;
}

function readTokenUsage(logFile) {
  if (!fs.existsSync(logFile) || !fs.statSync(logFile).isFile()) {
    return {
      totalTokens: null,
      inputTokens: null,
      outputTokens: null,
      cachedTokens: null,
      reasoningTokens: null,
    };
  }

  return parseTokenUsage(fs.readFileSync(logFile, 'utf8'));
}

function createFallbackOutput({ batch, outputFile, logFile, reason }) {
  return [
    '# Ecosystem AI Runner Output',
    '',
    '- Status: failed',
    '- Mode: centralized-ecosystem',
    `- Batch: ${batch.id}`,
    `- Repositories: ${[...new Set(batch.tasks.flatMap((task) => task.repositories))].join(', ')}`,
    `- Tasks: ${batch.tasks.map((task) => task.id).join(', ')}`,
    '- Result: Runner generated this fallback because the batch did not produce a valid mandatory output file.',
    '- Validation: not determined',
    '- Docs Updated: none',
    '- Gaps: output file was not produced correctly',
    '- Needs Rework: yes',
    `- Notes: ${reason}; expected output file: ${outputFile}; inspect stage log: ${logFile}`,
  ].join('\n') + '\n';
}

function buildBatchMetadata({
  ecosystemName,
  agent,
  runId,
  batch,
  history,
  status,
  startedAt = null,
  finishedAt = null,
  exitCode = null,
  usage = null,
  failureReason = null,
}) {
  return {
    ecosystem: ecosystemName,
    agent: agent
      ? {
          name: agent.name,
          type: agent.type,
          command: agent.command,
          args: agent.args,
        }
      : null,
    runId,
    status,
    mode: 'centralized-ecosystem',
    batch: {
      id: batch.id,
      label: batch.label,
    },
    tasks: batch.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      scope: task.scope,
      repositories: task.repositories,
      file: task.filePath,
    })),
    startedAt,
    finishedAt,
    exitCode,
    usage,
    failureReason,
    files: {
      prompt: history.promptFile,
      output: history.outputFile,
      log: history.logFile,
      summary: history.summaryFile,
      tasks: history.tasksDir,
    },
  };
}

function buildBatchSummary({ runId, agent, batch, history, status, exitCode, durationMs, usage, failureReason = null }) {
  return {
    ecosystemRunId: runId,
    mode: 'centralized-ecosystem',
    agent: agent
      ? {
          name: agent.name,
          type: agent.type,
          command: agent.command,
        }
      : null,
    batch: {
      id: batch.id,
      label: batch.label,
    },
    tasks: batch.tasks.map((task) => ({
      id: task.id,
      scope: task.scope,
      repositories: task.repositories,
      file: task.relativePath,
    })),
    status,
    exitCode,
    durationMs,
    tokens: usage,
    failureReason,
    files: {
      output: history.outputFile,
      log: history.logFile,
      metadata: history.metadataFile,
    },
  };
}

function resolveBatches(options, taskIndex) {
  if (options.scope) {
    const scopeTasks = taskIndex.list.filter((task) => task.scope === options.scope);

    if (scopeTasks.length === 0) {
      throw new Error(`Scope "${options.scope}" did not match any central ecosystem task.`);
    }

    return [
      {
        id: options.scope,
        label: options.scope,
        tasks: scopeTasks,
      },
    ];
  }

  if (options.openScopes) {
    const openTasks = taskIndex.list.filter((task) => ACTIONABLE_TASK_STATUSES.has(task.status));

    if (openTasks.length === 0) {
      throw new Error('No actionable tasks were found in the central ecosystem SDD.');
    }

    const batchesByScope = new Map();

    for (const task of openTasks) {
      if (!task.scope) {
        throw new Error(`Open task "${task.id}" does not define a scope.`);
      }

      if (!batchesByScope.has(task.scope)) {
        batchesByScope.set(task.scope, {
          id: task.scope,
          label: task.scope,
          tasks: [],
        });
      }

      batchesByScope.get(task.scope).tasks.push(task);
    }

    return [...batchesByScope.values()];
  }

  if (options.openTasks) {
    const openTasks = taskIndex.list.filter((task) => ACTIONABLE_TASK_STATUSES.has(task.status));

    if (openTasks.length === 0) {
      throw new Error('No actionable tasks were found in the central ecosystem SDD.');
    }

    return [
      {
        id: 'open-tasks',
        label: 'Open Tasks',
        tasks: openTasks,
      },
    ];
  }

  if (options.feature) {
    const task = resolveFeatureTask(options.feature, taskIndex);
    return [
      {
        id: task.id,
        label: task.title,
        tasks: [task],
      },
    ];
  }

  if (options.tasks.length > 0) {
    const resolvedTasks = options.tasks.map((taskReference) => resolveTaskReference(taskReference, taskIndex));

    return [
      {
        id: resolvedTasks.length === 1 ? resolvedTasks[0].id : 'selected-tasks',
        label: resolvedTasks.length === 1 ? resolvedTasks[0].title : 'Selected Tasks',
        tasks: resolvedTasks,
      },
    ];
  }

  throw new Error('Use --task, --feature, --scope, --open-tasks, or --open-scopes.');
}

function log(message) {
  console.log(`[ecosystem-ai-runner] ${message}`);
}

async function runBatch({
  ecosystemName,
  agent,
  runId,
  batch,
  batchIndex,
  historyRoot,
  repositoriesById,
  dryRun,
}) {
  const history = createStageHistory({
    historyRoot,
    runId,
    batchIndex,
    batchId: batch.id,
    agentName: agent.name,
  });

  log(
    `resolved batch ${batch.id}: ${batch.tasks.map((task) => `${task.id}(${task.repositories.join(',')})`).join(', ')}`,
  );

  if (dryRun) {
    return;
  }

  if (fs.existsSync(history.stageDir)) {
    throw new Error(`History folder already exists for batch "${batch.id}": ${history.stageDir}. Use a different --run-id.`);
  }

  snapshotBatchTasks(history.tasksDir, batch.tasks);

  const prompt = buildSharedPrompt({
    ecosystemName,
    batch,
    repositoriesById,
    outputFile: history.outputFile,
  });

  writeText(history.promptFile, `${prompt}\n`);
  writeJson(
    history.metadataFile,
    buildBatchMetadata({
      ecosystemName,
      agent,
      runId,
      batch,
      history,
      status: 'running',
      startedAt: new Date().toISOString(),
    }),
  );

  const writableRoots = [
    ...new Set(batch.tasks.flatMap((task) => task.repositories).map((repositoryId) => repositoriesById.get(repositoryId).root)),
  ];
  const startedAt = Date.now();
  const exitCode = await runAgent({
    agent,
    prompt,
    stageHistory: history,
    cwd: process.cwd(),
    writableRoots,
  });

  if (exitCode !== 0) {
    const durationMs = Date.now() - startedAt;
    const usage = readTokenUsage(history.logFile);

    if (!fs.existsSync(history.outputFile) || fs.readFileSync(history.outputFile, 'utf8').trim().length === 0) {
      writeText(
        history.outputFile,
        createFallbackOutput({
          batch,
          outputFile: history.outputFile,
          logFile: history.logFile,
          reason: `${agent.name} failed with exit code ${exitCode}`,
        }),
      );
    }

    writeJson(
      history.metadataFile,
      buildBatchMetadata({
        ecosystemName,
        agent,
        runId,
        batch,
        history,
        status: 'failed',
        finishedAt: new Date().toISOString(),
        exitCode,
        usage,
        failureReason: `${agent.name} failed for batch "${batch.id}" with exit code ${exitCode}.`,
      }),
    );

    writeJson(
      history.summaryFile,
      buildBatchSummary({
        runId,
        agent,
        batch,
        history,
        status: 'failed',
        exitCode,
        durationMs,
        usage,
        failureReason: `${agent.name} failed for batch "${batch.id}" with exit code ${exitCode}.`,
      }),
    );

    throw new Error(`${agent.name} failed for batch "${batch.id}" with exit code ${exitCode}.`);
  }

  readOutputFile(history.outputFile);

  const durationMs = Date.now() - startedAt;
  const usage = readTokenUsage(history.logFile);

  writeJson(
    history.metadataFile,
    buildBatchMetadata({
      ecosystemName,
      agent,
      runId,
      batch,
      history,
      status: 'success',
      finishedAt: new Date().toISOString(),
      exitCode,
      usage,
    }),
  );

  writeJson(
    history.summaryFile,
    buildBatchSummary({
      runId,
      agent,
      batch,
      history,
      status: 'success',
      exitCode,
      durationMs,
      usage,
    }),
  );

  log(`completed batch ${batch.id}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const selectedModes = [
    options.scope ? 'scope' : null,
    options.openTasks ? 'open-tasks' : null,
    options.openScopes ? 'open-scopes' : null,
    options.feature ? 'feature' : null,
    options.tasks.length > 0 ? 'task' : null,
  ].filter(Boolean);

  if (selectedModes.length !== 1) {
    throw new Error('Use exactly one selection mode: --task, --feature, --scope, --open-tasks, or --open-scopes.');
  }

  const { config, configPath, configDir } = loadConfig(options.config);
  const repositories = resolveRepositories(configDir, config.repositories);
  const sddRoot = path.resolve(configDir, config.sddRoot || 'sdd');
  const tasksDir = path.join(sddRoot, 'tasks');
  const historyRoot = path.resolve(configDir, config.historyRoot || 'runs');
  const runId = options.runId || createRunId();
  const taskIndex = loadTasks({
    tasksDir,
    repositoriesById: repositories.byId,
  });
  const batches = resolveBatches(options, taskIndex);
  const agent = resolveAgentConfig(config, options.agent);

  log(`config: ${configPath}`);
  log(`ecosystem: ${config.name}`);
  log(`agent: ${agent.name} (${agent.type})`);
  log(`sdd root: ${sddRoot}`);
  log(`run id: ${runId}`);
  log(`history: ${path.join(historyRoot, runId)}`);

  for (let index = 0; index < batches.length; index += 1) {
    await runBatch({
      ecosystemName: config.name,
      agent,
      runId,
      batch: batches[index],
      batchIndex: index,
      historyRoot,
      repositoriesById: repositories.byId,
      dryRun: options.dryRun,
    });
  }

  if (options.dryRun) {
    log('dry run complete; agent was not invoked.');
    return;
  }

  log('ecosystem execution completed successfully.');
}

main().catch((error) => {
  console.error(`[ecosystem-ai-runner] failed: ${error.message}`);
  process.exitCode = 1;
});
