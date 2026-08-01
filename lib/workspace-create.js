'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { normalizeGitHubProjectConfig } = require('./github-project');
const { ROOT } = require('./workspaces');
const { ensureString, ensureStringArray, slugify, resolveContainedPath, ensurePositiveInteger } = require('./utils');

const DEFAULT_AGENTS = {
  codex: {
    type: 'codex',
    command: 'codex',
    codex: {
      sessionPolicy: 'task',
      resumeOnNeedsRework: true,
      sandbox: 'workspace-write',
      approvalPolicy: 'never',
      models: { mechanical: 'gpt-5.6-luna', standard: 'gpt-5.6-terra', deep: 'gpt-5.6-sol' },
      reasoning: { mechanical: 'low', standard: 'medium', deep: 'high' },
    },
  },
  'claude-code': {
    type: 'claude-code',
    command: 'claude',
    args: ['-p'],
  },
  kiro: {
    type: 'kiro',
    command: 'kiro-cli',
    args: ['chat', '--no-interactive', '--trust-all-tools'],
  },
};

/**
 * Detect the model currently being used by the invoking agent.
 * Returns model string or null.
 */
function detectCurrentModel() {
  // Explicit env vars
  if (process.env.KIRO_MODEL) return process.env.KIRO_MODEL;
  if (process.env.ANTHROPIC_MODEL) return process.env.ANTHROPIC_MODEL;
  if (process.env.CODEX_MODEL) return process.env.CODEX_MODEL;
  return null;
}

/**
 * Build agents config with the detected model injected into the default agent.
 */
function buildAgentsWithModel(baseAgents, defaultAgentName) {
  const model = detectCurrentModel();
  const agents = { ...baseAgents };
  if (model && agents[defaultAgentName] && !agents[defaultAgentName].codex) {
    agents[defaultAgentName] = { ...agents[defaultAgentName], model };
  }
  return agents;
}

/**
 * Detect which agent/LLM is invoking the MCP server.
 * Uses environment variables and process ancestry to determine the caller.
 * Returns the agent id string or null if undetectable.
 */
function detectCallerAgent() {
  // Explicit override: user or tool can set this
  if (process.env.ECOSYSTEM_AGENT) return process.env.ECOSYSTEM_AGENT;

  // Kiro sets KIRO_CLI or is invoked via kiro-cli
  if (process.env.KIRO_CLI || process.env.KIRO_SESSION_ID || process.env.KIRO_MODEL) return 'kiro';

  // Claude Code sets CLAUDE_CODE or similar markers
  if (process.env.CLAUDE_CODE || process.env.CLAUDE_PLUGIN_ROOT) return 'claude-code';

  // Codex sets CODEX_* environment variables
  if (process.env.CODEX_SESSION_ID || process.env.CODEX_HOME) return 'codex';

  // Check parent process name as fallback
  try {
    const ppidCmdline = fs.readFileSync(`/proc/${process.ppid}/cmdline`, 'utf8');
    if (ppidCmdline.includes('kiro')) return 'kiro';
    if (ppidCmdline.includes('claude')) return 'claude-code';
    if (ppidCmdline.includes('codex')) return 'codex';
  } catch { /* not on Linux or no /proc access */ }

  return null;
}

function createWorkspace(args) {
  const name = ensureString(args.name, 'name');
  const directoryName = slugify(args.directoryName || name);
  if (!directoryName) throw new Error('Field "directoryName" must resolve to a non-empty slug.');

  const repositories = normalizeRepositories(args.repositories);
  const githubProject = resolveGitHubProjectDecision(args);
  const detectedAgent = detectCallerAgent();
  const defaultAgent = args.defaultAgent
    ? ensureString(args.defaultAgent, 'defaultAgent')
    : (detectedAgent || 'codex');
  const rawAgents = args.agents && typeof args.agents === 'object' && !Array.isArray(args.agents)
    ? args.agents
    : buildAgentsWithModel(DEFAULT_AGENTS, defaultAgent);
  const agents = normalizeAgents(rawAgents);
  const tokenPolicy = normalizeTokenPolicy(args.tokenPolicy);

  if (!agents[defaultAgent]) {
    throw new Error(`Default agent "${defaultAgent}" must exist in agents.`);
  }

  const wsDir = path.join(ROOT, 'workspaces', directoryName);
  if (fs.existsSync(wsDir)) {
    throw new Error(`Workspace "${directoryName}" already exists: ${wsDir}`);
  }

  const sddRoot = normalizeWorkspaceRelativePath(wsDir, args.sddRoot || 'sdd', 'sddRoot');
  const historyRoot = normalizeWorkspaceRelativePath(wsDir, args.historyRoot || 'runs', 'historyRoot');
  const stagingDir = `${wsDir}.tmp.${process.pid}.${Date.now()}`;
  const stagingConfigPath = path.join(stagingDir, 'workspace.config.json');
  const stagingSddDir = path.join(stagingDir, sddRoot);
  const stagingTasksDir = path.join(stagingSddDir, 'tasks');
  const stagingSkillsDir = path.join(stagingDir, 'skills');
  const stagingRunsDir = path.join(stagingDir, historyRoot);
  const configPath = path.join(wsDir, 'workspace.config.json');
  const sddDir = path.join(wsDir, sddRoot);
  const tasksDir = path.join(sddDir, 'tasks');
  const skillsDir = path.join(wsDir, 'skills');
  const runsDir = path.join(wsDir, historyRoot);

  const config = {
    name,
    historyRoot,
    sddRoot,
    ...(githubProject ? { githubProject: { url: githubProject.url } } : {}),
    defaultAgent,
    agents,
    tokenPolicy,
    repositories: repositories.map((repo) => ({
      id: repo.id,
      label: repo.label,
      path: formatRepositoryConfigPath(wsDir, repo.path),
      ...(repo.docsHints.length ? { docsHints: repo.docsHints } : {}),
      ...(repo.validation.length ? { validation: repo.validation } : {}),
    })),
  };

  try {
    fs.mkdirSync(stagingTasksDir, { recursive: true });
    fs.mkdirSync(stagingSkillsDir, { recursive: true });
    fs.mkdirSync(stagingRunsDir, { recursive: true });
    writeJson(stagingConfigPath, config);
    writeText(path.join(stagingSkillsDir, '.gitkeep'), '');
    writeText(path.join(stagingTasksDir, '.gitkeep'), '');
    writeText(path.join(stagingRunsDir, '.gitkeep'), '');
    writeText(path.join(stagingSddDir, 'README.md'), buildSddReadme({ name, githubProject, repositories, docsQualityBaseline: args.docsQualityBaseline }));
    fs.renameSync(stagingDir, wsDir);
  } catch (error) {
    try {
      fs.rmSync(stagingDir, { recursive: true, force: true });
    } catch (cleanupError) {
      throw new Error(`${error.message}. Workspace staging cleanup failed: ${cleanupError.message}`);
    }
    throw error;
  }

  return {
    workspace: directoryName,
    name,
    configPath,
    wsDir,
    sddRoot: sddDir,
    tasksDir,
    historyRoot: runsDir,
    githubProject,
    taskCardSyncReady: Boolean(githubProject),
    defaultAgent,
    detectedAgent: detectedAgent || null,
    repositories: config.repositories,
    created: [
      configPath,
      path.join(sddDir, 'README.md'),
      tasksDir,
      skillsDir,
      runsDir,
    ],
  };
}

function resolveGitHubProjectDecision(args) {
  const rawProject = args.githubProject || args.githubProjectUrl;
  if (rawProject) return normalizeGitHubProjectConfig(rawProject);

  if (args.skipGithubProject === true) return null;

  throw new Error(
    'GitHub Project URL is required unless skipGithubProject is true. ' +
      'Ask the user for the GitHub Project URL, or ask them to confirm that this workspace does not need a Project.',
  );
}

function normalizeRepositories(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Field "repositories" must contain at least one repository.');
  }

  const seen = new Set();

  return value.map((repo, index) => {
    if (!repo || typeof repo !== 'object' || Array.isArray(repo)) {
      throw new Error(`Repository at index ${index} must be an object.`);
    }

    const id = slugify(ensureString(repo.id, `repositories.${index}.id`));
    if (!id) throw new Error(`Repository at index ${index} must have a non-empty id slug.`);
    if (seen.has(id)) throw new Error(`Duplicate repository id "${id}".`);
    seen.add(id);

    const repoPath = ensureString(repo.path, `repositories.${id}.path`);
    const resolvedPath = path.resolve(process.cwd(), repoPath);
    if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isDirectory()) {
      throw new Error(`Repository "${id}" path does not exist: ${resolvedPath}`);
    }
    const gitCheck = spawnSync('git', ['-C', resolvedPath, 'rev-parse', '--show-toplevel'], { encoding: 'utf8', timeout: 30000 });
    if (gitCheck.status !== 0) {
      throw new Error(`Repository "${id}" path is not a Git working tree: ${resolvedPath}`);
    }
    const repositoryRoot = fs.realpathSync(gitCheck.stdout.trim());
    if (repositoryRoot !== fs.realpathSync(resolvedPath)) {
      throw new Error(`Repository "${id}" path must be the Git top-level directory: ${repositoryRoot}`);
    }

    return {
      id,
      label: repo.label ? ensureString(repo.label, `repositories.${id}.label`) : id,
      path: repositoryRoot,
      docsHints: ensureStringArray(repo.docsHints, `repositories.${id}.docsHints`),
      validation: ensureStringArray(repo.validation, `repositories.${id}.validation`),
    };
  });
}

function formatRepositoryConfigPath(wsDir, repositoryPath) {
  const relativePath = path.relative(wsDir, repositoryPath) || '.';
  return relativePath.split(path.sep).join('/');
}

function buildSddReadme({ name, githubProject, repositories, docsQualityBaseline }) {
  return [
    `# ${name} SDD`,
    '',
    `This workspace centralizes execution planning for ${name} while keeping code and human documentation inside their owning repositories.`,
    '',
    ...(githubProject ? [`GitHub Project: ${githubProject.url}`, ''] : ['GitHub Project: not configured', '']),
    '## Structure',
    '',
    '- `tasks/`: executable tasks for this workspace queue',
    '- use the shared `workspace-task-factory` skill to create tasks later, intentionally',
    '',
    'This bootstrap does not pre-create implementation tasks. Future work for this workspace should be created under this workspace `sdd/tasks/` directory through `workspace-task-factory`.',
    '',
    '## Repositories',
    '',
    ...repositories.map((repo) => `- \`${repo.id}\`: ${repo.label}`),
    '',
    '## Docs Quality Baseline',
    '',
    ...formatDocsQualityBaseline(docsQualityBaseline),
    '',
    '## Task Status',
    '',
    '- No tasks yet',
    '',
  ].join('\n');
}

function formatDocsQualityBaseline(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return [
      '- not recorded by `create_workspace`',
      '- run a repository reading pass before creating docs recovery tasks',
    ];
  }

  const lines = [];
  for (const entry of value) {
    const repository = ensureString(entry.repository, 'docsQualityBaseline.repository');
    lines.push(`### ${repository}`, '');
    lines.push(`- score: \`${ensureString(entry.score, `docsQualityBaseline.${repository}.score`)}\``);
    lines.push(`- label: \`${ensureString(entry.label, `docsQualityBaseline.${repository}.label`)}\``);
    lines.push('- evidence files read:');
    for (const file of ensureStringArray(entry.evidenceFiles, `docsQualityBaseline.${repository}.evidenceFiles`)) {
      lines.push(`  - \`${file}\``);
    }
    lines.push('- missing areas:');
    const missingAreas = ensureStringArray(entry.missingAreas, `docsQualityBaseline.${repository}.missingAreas`);
    if (missingAreas.length) {
      for (const area of missingAreas) lines.push(`  - ${area}`);
    } else {
      lines.push('  - no major baseline gaps recorded');
    }
    lines.push('');
  }
  return lines;
}

function ensureOptionalString(value, fieldName) {
  if (value === undefined || value === null) return null;
  return ensureString(value, fieldName);
}

function normalizeWorkspaceRelativePath(wsDir, value, fieldName) {
  const resolved = resolveContainedPath(wsDir, ensureString(value, fieldName), fieldName);
  const relative = path.relative(wsDir, resolved);
  if (!relative) throw new Error(`Field "${fieldName}" must name a directory inside the workspace.`);
  return relative.split(path.sep).join('/');
}

function normalizeAgents(value) {
  const entries = Object.entries(value || {});
  if (!entries.length) throw new Error('Field "agents" must configure at least one agent.');
  return Object.fromEntries(entries.map(([name, config]) => {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      throw new Error(`Agent "${name}" configuration must be an object.`);
    }
    const command = ensureString(config.command || name, `agents.${name}.command`);
    const agentArgs = ensureStringArray(config.args, `agents.${name}.args`);
    const env = config.env || {};
    if (!env || typeof env !== 'object' || Array.isArray(env)) {
      throw new Error(`Field "agents.${name}.env" must be an object.`);
    }
    for (const [key, envValue] of Object.entries(env)) {
      ensureString(key, `agents.${name}.env key`);
      ensureString(envValue, `agents.${name}.env.${key}`);
    }
    const modelRoutes = config.modelRoutes === undefined ? [] : config.modelRoutes;
    if (!Array.isArray(modelRoutes)) throw new Error(`Field "agents.${name}.modelRoutes" must be an array.`);
    const normalizedRoutes = modelRoutes.map((route, index) => {
      if (!route || typeof route !== 'object' || Array.isArray(route)) {
        throw new Error(`Field "agents.${name}.modelRoutes.${index}" must be an object.`);
      }
      return {
        maxPromptTokens: ensurePositiveInteger(route.maxPromptTokens, `agents.${name}.modelRoutes.${index}.maxPromptTokens`),
        model: ensureString(route.model, `agents.${name}.modelRoutes.${index}.model`),
        ...(route.reasoningEffort
          ? { reasoningEffort: normalizeChoice(route.reasoningEffort, `agents.${name}.modelRoutes.${index}.reasoningEffort`, ['low', 'medium', 'high', 'xhigh']) }
          : {}),
      };
    });
    if (new Set(normalizedRoutes.map((route) => route.maxPromptTokens)).size !== normalizedRoutes.length) {
      throw new Error(`Field "agents.${name}.modelRoutes" must use unique maxPromptTokens values.`);
    }
    const allowedModels = ensureStringArray(config.allowedModels, `agents.${name}.allowedModels`);
    if (new Set(allowedModels).size !== allowedModels.length) {
      throw new Error(`Field "agents.${name}.allowedModels" must not contain duplicates.`);
    }
    return [name, {
      ...(config.type ? { type: ensureString(config.type, `agents.${name}.type`) } : {}),
      command,
      args: agentArgs,
      ...(config.model ? { model: ensureString(config.model, `agents.${name}.model`) } : {}),
      ...(config.reasoningEffort
        ? { reasoningEffort: normalizeChoice(config.reasoningEffort, `agents.${name}.reasoningEffort`, ['low', 'medium', 'high', 'xhigh']) }
        : {}),
      ...(allowedModels.length ? { allowedModels } : {}),
      ...(normalizedRoutes.length ? { modelRoutes: normalizedRoutes } : {}),
      ...(config.codex !== undefined ? { codex: normalizeCodexOptions(config.codex, name) } : {}),
      ...(Object.keys(env).length ? { env } : {}),
      ...(config.timeoutSeconds !== undefined
        ? { timeoutSeconds: ensurePositiveInteger(config.timeoutSeconds, `agents.${name}.timeoutSeconds`) }
        : {}),
    }];
  }));
}

function normalizeChoice(value, fieldName, choices) {
  const resolved = ensureString(value, fieldName);
  if (!choices.includes(resolved)) throw new Error(`Field "${fieldName}" must be one of: ${choices.join(', ')}.`);
  return resolved;
}

function normalizeCodexOptions(value, agentName) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Field "agents.${agentName}.codex" must be an object.`);
  }
  const models = value.models || {};
  const reasoning = value.reasoning || {};
  if (!models || typeof models !== 'object' || Array.isArray(models)) {
    throw new Error(`Field "agents.${agentName}.codex.models" must be an object.`);
  }
  if (!reasoning || typeof reasoning !== 'object' || Array.isArray(reasoning)) {
    throw new Error(`Field "agents.${agentName}.codex.reasoning" must be an object.`);
  }
  for (const field of ['resumeOnNeedsRework', 'ignoreUserConfig', 'ignoreRules']) {
    if (value[field] !== undefined && typeof value[field] !== 'boolean') {
      throw new Error(`Field "agents.${agentName}.codex.${field}" must be a boolean.`);
    }
  }
  return {
    sessionPolicy: normalizeChoice(value.sessionPolicy || 'task', `agents.${agentName}.codex.sessionPolicy`, ['task', 'ephemeral']),
    resumeOnNeedsRework: value.resumeOnNeedsRework !== false,
    sandbox: normalizeChoice(value.sandbox || 'workspace-write', `agents.${agentName}.codex.sandbox`, ['read-only', 'workspace-write', 'danger-full-access']),
    approvalPolicy: normalizeChoice(value.approvalPolicy || 'never', `agents.${agentName}.codex.approvalPolicy`, ['untrusted', 'on-request', 'never']),
    ...(value.profile ? { profile: ensureString(value.profile, `agents.${agentName}.codex.profile`) } : {}),
    ignoreUserConfig: value.ignoreUserConfig === true,
    ignoreRules: value.ignoreRules === true,
    models: {
      mechanical: ensureString(models.mechanical || 'gpt-5.6-luna', `agents.${agentName}.codex.models.mechanical`),
      standard: ensureString(models.standard || 'gpt-5.6-terra', `agents.${agentName}.codex.models.standard`),
      deep: ensureString(models.deep || 'gpt-5.6-sol', `agents.${agentName}.codex.models.deep`),
    },
    reasoning: {
      mechanical: normalizeChoice(reasoning.mechanical || 'low', `agents.${agentName}.codex.reasoning.mechanical`, ['low', 'medium', 'high', 'xhigh']),
      standard: normalizeChoice(reasoning.standard || 'medium', `agents.${agentName}.codex.reasoning.standard`, ['low', 'medium', 'high', 'xhigh']),
      deep: normalizeChoice(reasoning.deep || 'high', `agents.${agentName}.codex.reasoning.deep`, ['low', 'medium', 'high', 'xhigh']),
    },
  };
}

function normalizeTokenPolicy(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Field "tokenPolicy" must be an object.');
  }
  if (value.batchRelatedTasks !== undefined && typeof value.batchRelatedTasks !== 'boolean') {
    throw new Error('Field "tokenPolicy.batchRelatedTasks" must be a boolean.');
  }
  return {
    contextBudgetTokens: value.contextBudgetTokens === undefined ? 4000 : ensurePositiveInteger(value.contextBudgetTokens, 'tokenPolicy.contextBudgetTokens'),
    reviewDiffBudgetTokens: value.reviewDiffBudgetTokens === undefined ? 2000 : ensurePositiveInteger(value.reviewDiffBudgetTokens, 'tokenPolicy.reviewDiffBudgetTokens'),
    batchRelatedTasks: value.batchRelatedTasks === true,
    batchSize: value.batchSize === undefined ? 3 : ensurePositiveInteger(value.batchSize, 'tokenPolicy.batchSize', 12),
  };
}

function writeJson(filePath, value) {
  writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  fs.writeFileSync(filePath, value);
}

module.exports = { createWorkspace };
