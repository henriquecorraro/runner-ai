'use strict';

const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

const STATUS_OPTIONS = [
  { name: 'Todo', color: 'GRAY', description: 'Not started' },
  { name: 'In Progress', color: 'BLUE', description: 'Actively being worked on' },
  { name: 'Testing', color: 'YELLOW', description: 'Implementation complete, awaiting validation' },
  { name: 'Done', color: 'GREEN', description: 'Validated and closed' },
];

function createGitHubProject({ ws, title }) {
  const ownerId = getOwnerId(ws.githubProject || inferOwner(ws));
  const ownerInfo = ws.githubProject || inferOwner(ws);

  // Create project
  const project = ghGraphql(
    `mutation($ownerId: ID!, $title: String!) {
      createProjectV2(input: { ownerId: $ownerId, title: $title }) {
        projectV2 { id number url }
      }
    }`,
    { ownerId, title },
  );
  const { id: projectId, number, url } = project.createProjectV2.projectV2;

  // Create Status field with options
  const optionsInput = STATUS_OPTIONS.map((o) => ({ name: o.name, color: o.color, description: o.description }));
  ghGraphql(
    `mutation($projectId: ID!, $name: String!, $options: [ProjectV2SingleSelectFieldOptionInput!]!) {
      createProjectV2Field(input: { projectId: $projectId, dataType: SINGLE_SELECT, name: $name, singleSelectOptions: $options }) {
        projectV2Field { ... on ProjectV2SingleSelectField { id name } }
      }
    }`,
    { projectId, name: 'Status', options: JSON.stringify(optionsInput) },
  );

  // Update workspace config
  const githubProject = {
    title,
    url,
    ownerType: ownerInfo.ownerType,
    owner: ownerInfo.owner,
    number,
  };
  updateWorkspaceConfig(ws.configPath, githubProject);

  return {
    created: true,
    project: githubProject,
    statusField: STATUS_OPTIONS.map((o) => o.name),
    note: 'Project created. The default view (views/1) is a Table. Change it to Board layout manually in the GitHub UI for kanban.',
  };
}

function inferOwner(ws) {
  // Try to infer from first repository's git remote
  const repo = ws.repositories[0];
  if (!repo) throw new Error('Workspace has no repositories to infer GitHub owner from.');

  const result = spawnSync('git', ['-C', repo.root, 'config', '--get', 'remote.origin.url'], { encoding: 'utf8', timeout: 30000 });
  if (result.status !== 0) throw new Error(`Cannot infer GitHub owner: ${result.error ? result.error.message : 'no git remote found'}.`);

  const remote = result.stdout.trim();
  const match = remote.match(/github\.com[:/]([^/]+)\//);
  if (!match) throw new Error(`Cannot infer GitHub owner from remote: ${remote}`);

  return { owner: match[1], ownerType: 'organization' };
}

function getOwnerId({ owner, ownerType }) {
  const field = ownerType === 'organization' ? 'organization' : 'user';
  const data = ghGraphql(
    `query($login: String!) { ${field}(login: $login) { id } }`,
    { login: owner },
  );
  return data[field].id;
}

function updateWorkspaceConfig(configPath, githubProject) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  config.githubProject = { title: githubProject.title, url: githubProject.url };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
}

function ghGraphql(query, variables) {
  const args = ['api', 'graphql', '-f', `query=${query}`];
  for (const [key, value] of Object.entries(variables || {})) {
    if (typeof value === 'number' || typeof value === 'boolean') {
      args.push('-F', `${key}=${value}`);
    } else {
      args.push('-f', `${key}=${value}`);
    }
  }
  const result = spawnSync('gh', args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10, timeout: 30000 });
  if (result.status !== 0) {
    throw new Error(`GitHub GraphQL failed: ${[result.error && result.error.message, result.stderr, result.stdout].filter(Boolean).join('\n').trim()}`);
  }
  const parsed = JSON.parse(result.stdout);
  if (parsed.errors?.length) {
    throw new Error(`GitHub GraphQL errors: ${parsed.errors.map((e) => e.message).join('; ')}`);
  }
  return parsed.data;
}

module.exports = { createGitHubProject };
