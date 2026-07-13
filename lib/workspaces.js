'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { readJson } = require('./utils');
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
  const sddRoot = path.resolve(wsDir, config.sddRoot || 'sdd');
  const tasksDir = path.join(sddRoot, 'tasks');
  const historyRoot = path.resolve(wsDir, config.historyRoot || 'runs');
  const githubProject = normalizeGitHubProjectConfig(
    config.githubProject || config.githubProjectUrl,
  );

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
