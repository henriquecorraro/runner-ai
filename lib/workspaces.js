'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { readJson, resolveContainedPath, ensurePositiveInteger } = require('./utils');
const { normalizeGitHubProjectConfig } = require('./github-project');

const ROOT = path.resolve(__dirname, '..');

function listWorkspaces() {
  const workspacesRoot = path.join(ROOT, 'workspaces');
  if (!fs.existsSync(workspacesRoot)) return [];

  return fs
    .readdirSync(workspacesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const wsDir = path.join(workspacesRoot, entry.name);
      const configPath = path.join(wsDir, 'workspace.config.json');
      if (!fs.existsSync(configPath)) return null;
      return describeWorkspace(entry.name, readJson(configPath), wsDir, configPath);
    })
    .filter(Boolean);
}

function describeWorkspace(directoryName, config, wsDir, configPath) {
  const sddRoot = resolveContainedPath(wsDir, config.sddRoot || 'sdd', 'sddRoot');
  const tasksDir = path.join(sddRoot, 'tasks');
  const historyRoot = resolveContainedPath(wsDir, config.historyRoot || 'runs', 'historyRoot');
  const githubProject = normalizeGitHubProjectConfig(
    config.githubProject || config.githubProjectUrl,
  );
  const rawTokenPolicy = config.tokenPolicy || {};
  if (!rawTokenPolicy || typeof rawTokenPolicy !== 'object' || Array.isArray(rawTokenPolicy)) {
    throw new Error(`Workspace "${directoryName}" tokenPolicy must be an object.`);
  }
  if (rawTokenPolicy.batchRelatedTasks !== undefined && typeof rawTokenPolicy.batchRelatedTasks !== 'boolean') {
    throw new Error(`Workspace "${directoryName}" tokenPolicy.batchRelatedTasks must be a boolean.`);
  }

  return {
    name: config.name || directoryName,
    directoryName,
    configPath,
    wsDir,
    sddRoot,
    tasksDir,
    historyRoot,
    githubProject,
    defaultAgent: config.defaultAgent || 'codex',
    agents: describeAgents(config.agents || {}),
    tokenPolicy: {
      contextBudgetTokens: rawTokenPolicy.contextBudgetTokens === undefined ? 4000 : ensurePositiveInteger(rawTokenPolicy.contextBudgetTokens, 'tokenPolicy.contextBudgetTokens'),
      reviewDiffBudgetTokens: rawTokenPolicy.reviewDiffBudgetTokens === undefined ? 2000 : ensurePositiveInteger(rawTokenPolicy.reviewDiffBudgetTokens, 'tokenPolicy.reviewDiffBudgetTokens'),
      batchRelatedTasks: rawTokenPolicy.batchRelatedTasks === true,
      batchSize: rawTokenPolicy.batchSize === undefined ? 3 : ensurePositiveInteger(rawTokenPolicy.batchSize, 'tokenPolicy.batchSize', 12),
    },
    repositories: Array.isArray(config.repositories)
      ? config.repositories.map((repo) => ({
          id: repo.id,
          label: repo.label || repo.id,
          root: path.resolve(wsDir, repo.path),
          githubFullName: repo.githubFullName || (repo.github && repo.github.fullName) || null,
          validation: Array.isArray(repo.validation) ? repo.validation : [],
          docsHints: Array.isArray(repo.docsHints) ? repo.docsHints : [],
        }))
      : [],
  };
}

function describeAgents(agents) {
  if (!agents || typeof agents !== 'object' || Array.isArray(agents)) return {};
  return Object.fromEntries(Object.entries(agents).map(([name, agent]) => {
    if (!agent || typeof agent !== 'object' || Array.isArray(agent)) {
      throw new Error(`Agent "${name}" configuration must be an object.`);
    }
    const configuredModels = new Set(Array.isArray(agent.allowedModels) ? agent.allowedModels : []);
    if (typeof agent.model === 'string' && agent.model) configuredModels.add(agent.model);
    for (const route of Array.isArray(agent.modelRoutes) ? agent.modelRoutes : []) {
      if (route && typeof route.model === 'string' && route.model) configuredModels.add(route.model);
    }
    if (agent.codex && agent.codex.models && typeof agent.codex.models === 'object') {
      for (const model of Object.values(agent.codex.models)) {
        if (typeof model === 'string' && model) configuredModels.add(model);
      }
    }
    return [name, {
      name,
      type: agent.type || name,
      command: agent.command || name,
      configuredModels: [...configuredModels].sort(),
    }];
  }));
}

function getWorkspace(name) {
  const { ensureString } = require('./utils');
  const wanted = ensureString(name, 'workspace');
  const workspace = listWorkspaces().find(
    (c) => c.directoryName === wanted || c.name === wanted,
  );
  if (!workspace) throw new Error(`Workspace "${wanted}" was not found.`);
  return workspace;
}

module.exports = { listWorkspaces, getWorkspace, ROOT };
