'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { normalizeGitHubProjectConfig } = require('./github-project');
const { ROOT } = require('./workspaces');
const { ensureString, ensureStringArray, slugify } = require('./utils');

const DEFAULT_AGENTS = {
  codex: {
    type: 'codex',
    command: 'codex',
    args: ['exec', '--ephemeral'],
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
  if (model && agents[defaultAgentName]) {
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
  const agents = args.agents && typeof args.agents === 'object' && !Array.isArray(args.agents)
    ? args.agents
    : buildAgentsWithModel(DEFAULT_AGENTS, defaultAgent);

  if (!agents[defaultAgent]) {
    throw new Error(`Default agent "${defaultAgent}" must exist in agents.`);
  }

  const wsDir = path.join(ROOT, 'workspaces', directoryName);
  if (fs.existsSync(wsDir)) {
    throw new Error(`Workspace "${directoryName}" already exists: ${wsDir}`);
  }

  const sddRoot = ensureOptionalString(args.sddRoot, 'sddRoot') || 'sdd';
  const historyRoot = ensureOptionalString(args.historyRoot, 'historyRoot') || 'runs';
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
    repositories: repositories.map((repo) => ({
      id: repo.id,
      label: repo.label,
      path: formatRepositoryConfigPath(wsDir, repo.path),
      ...(repo.docsHints.length ? { docsHints: repo.docsHints } : {}),
      ...(repo.validation.length ? { validation: repo.validation } : {}),
    })),
  };

  fs.mkdirSync(tasksDir, { recursive: true });
  fs.mkdirSync(skillsDir, { recursive: true });
  fs.mkdirSync(runsDir, { recursive: true });
  writeJson(configPath, config);
  writeText(path.join(skillsDir, '.gitkeep'), '');
  writeText(path.join(tasksDir, '.gitkeep'), '');
  writeText(path.join(runsDir, '.gitkeep'), '');
  writeText(path.join(sddDir, 'README.md'), buildSddReadme({ name, githubProject, repositories, docsQualityBaseline: args.docsQualityBaseline }));

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

    return {
      id,
      label: repo.label ? ensureString(repo.label, `repositories.${id}.label`) : id,
      path: resolvedPath,
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

function writeJson(filePath, value) {
  writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  fs.writeFileSync(filePath, value);
}

module.exports = { createWorkspace };
