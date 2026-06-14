'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { readJson } = require('./utils');
const { normalizeGitHubProjectConfig } = require('./github-project');

const ROOT = path.resolve(__dirname, '..'); 

function listEcosystems() {
  const ecosystemsRoot = path.join(ROOT, 'ecosystems');
  if (!fs.existsSync(ecosystemsRoot)) return [];

  return fs
    .readdirSync(ecosystemsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const ecosystemDir = path.join(ecosystemsRoot, entry.name);
      const configPath = path.join(ecosystemDir, 'ecosystem.config.json');
      if (!fs.existsSync(configPath)) return null;
      return describeEcosystem(entry.name, readJson(configPath), ecosystemDir, configPath);
    })
    .filter(Boolean);
}

function describeEcosystem(directoryName, config, ecosystemDir, configPath) {
  const sddRoot = path.resolve(ecosystemDir, config.sddRoot || 'sdd');
  const tasksDir = path.join(sddRoot, 'tasks');
  const historyRoot = path.resolve(ecosystemDir, config.historyRoot || 'runs');
  const githubProject = normalizeGitHubProjectConfig(
    config.githubProject || config.githubProjectUrl,
  );

  return {
    name: config.name || directoryName,
    directoryName,
    configPath,
    ecosystemDir,
    sddRoot,
    tasksDir,
    historyRoot,
    githubProject,
    defaultAgent: config.defaultAgent || 'codex',
    repositories: Array.isArray(config.repositories)
      ? config.repositories.map((repo) => ({
          id: repo.id,
          label: repo.label || repo.id,
          root: path.resolve(ecosystemDir, repo.path),
          githubFullName: repo.githubFullName || (repo.github && repo.github.fullName) || null,
          validation: Array.isArray(repo.validation) ? repo.validation : [],
          docsHints: Array.isArray(repo.docsHints) ? repo.docsHints : [],
        }))
      : [],
  };
}

function getEcosystem(name) {
  const { ensureString } = require('./utils');
  const wanted = ensureString(name, 'ecosystem');
  const ecosystem = listEcosystems().find(
    (c) => c.directoryName === wanted || c.name === wanted,
  );
  if (!ecosystem) throw new Error(`Ecosystem "${wanted}" was not found.`);
  return ecosystem;
}

module.exports = { listEcosystems, getEcosystem, ROOT };
