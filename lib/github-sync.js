'use strict';

const { spawnSync } = require('node:child_process');
const { ensureString } = require('./utils');

const BOARD_STATUS = {
  todo: 'Todo',
  inProgress: 'In Progress',
  testing: 'Testing',
  done: 'Done',
};

function createTaskCard(ecosystem, task) {
  if (!ecosystem.githubProject) return { enabled: false, reason: 'githubProject not configured' };

  const primaryRepository = resolvePrimaryRepository(ecosystem, task);
  const draftBody = buildTaskCardBody(ecosystem, task, primaryRepository);
  const draft = createDraftProjectItem(ecosystem.githubProject, {
    title: task.title,
    body: draftBody,
  });
  const itemDatabaseId = Number(draft.projectItem.fullDatabaseId);
  const status = updateProjectItemStatusById(ecosystem.githubProject, itemDatabaseId, BOARD_STATUS.todo);

  assignDraftIssueToCurrentUser(draft.draftIssue.id);

  return {
    enabled: true,
    draftIssue: {
      nodeId: draft.draftIssue.id,
    },
    projectItem: {
      id: itemDatabaseId,
      nodeId: draft.projectItem.id,
      url: projectItemUrl(ecosystem.githubProject, itemDatabaseId),
      status,
    },
  };
}

function moveTaskCard(ecosystem, task, statusName) {
  if (!ecosystem.githubProject) return { enabled: false, reason: 'githubProject not configured' };
  if (!task.githubProjectItemId) {
    throw new Error(`Task "${task.id}" does not have github_project_item_id frontmatter.`);
  }

  const status = updateProjectItemStatusById(ecosystem.githubProject, task.githubProjectItemId, statusName);
  return { enabled: true, task: task.id, status };
}

function updateTaskCardCloseout(ecosystem, task, closeout) {
  if (!ecosystem.githubProject) return { enabled: false, reason: 'githubProject not configured' };
  if (!task.githubDraftIssueNodeId) {
    throw new Error(`Task "${task.id}" does not have github_draft_issue_node_id frontmatter.`);
  }

  const primaryRepository = resolvePrimaryRepository(ecosystem, task);
  const body = buildTaskCardBody(ecosystem, task, primaryRepository, closeout);
  const updated = updateDraftIssue(task.githubDraftIssueNodeId, { body });
  return {
    enabled: true,
    draftIssueNodeId: updated.id,
    updatedAt: updated.updatedAt,
  };
}

function resolvePrimaryRepository(ecosystem, task) {
  const primaryRepositoryId = task.repositories[0];
  const repository = ecosystem.repositories.find((repo) => repo.id === primaryRepositoryId);
  if (!repository) throw new Error(`Task "${task.id}" references unknown repository "${primaryRepositoryId}".`);

  return {
    ...repository,
    githubFullName: repository.githubFullName || inferGitHubFullName(repository.root),
  };
}

function createDraftProjectItem(githubProject, { title, body }) {
  const projectId = getProjectNodeId(githubProject);
  const response = ghGraphql(
    `mutation($projectId: ID!, $title: String!, $body: String!) {
      addProjectV2DraftIssue(input: {projectId: $projectId, title: $title, body: $body}) {
        projectItem {
          id
          fullDatabaseId
          content {
            ... on DraftIssue {
              id
            }
          }
        }
      }
    }`,
    { projectId, title, body },
  );
  const projectItem = response.addProjectV2DraftIssue.projectItem;
  return {
    projectItem,
    draftIssue: projectItem.content,
  };
}

function updateProjectItemStatusById(githubProject, itemId, statusName) {
  const status = resolveProjectStatusOption(githubProject, statusName);
  const endpoint = `${projectEndpoint(githubProject, `items/${itemId}`)}`;
  ghApi('PATCH', endpoint, { fields: [{ id: status.fieldId, value: status.optionId }] });
  return {
    fieldId: status.fieldId,
    optionId: status.optionId,
    name: status.optionName,
  };
}

function resolveProjectStatusOption(githubProject, statusName) {
  const fields = ghApi('GET', `${projectEndpoint(githubProject, 'fields')}?per_page=100`);
  const field = fields.find((candidate) => normalizeName(candidate.name) === 'status');
  if (!field) throw new Error(`GitHub Project ${githubProject.url} does not have a Status field.`);
  if (field.data_type !== 'single_select') {
    throw new Error(`GitHub Project Status field must be single_select, got "${field.data_type}".`);
  }

  const expected = normalizeName(statusName);
  const option = (field.options || []).find((candidate) => normalizeOptionName(candidate) === expected);
  if (!option) {
    const available = (field.options || []).map((candidate) => optionName(candidate)).join(', ') || 'none';
    throw new Error(`GitHub Project Status option "${statusName}" was not found. Available: ${available}`);
  }

  return {
    fieldId: field.id,
    optionId: option.id,
    optionName: optionName(option),
  };
}

function assignDraftIssueToCurrentUser(draftIssueId) {
  try {
    const userId = getAuthenticatedUserId();
    if (!userId) return;
    ghGraphql(
      `mutation($draftIssueId: ID!, $assigneeIds: [ID!]!) {
        updateProjectV2DraftIssue(input: {draftIssueId: $draftIssueId, assigneeIds: $assigneeIds}) {
          draftIssue { id }
        }
      }`,
      { draftIssueId, assigneeIds: [userId] },
    );
  } catch (_) {
    // Non-critical — card was created, just not assigned.
  }
}

let _cachedUserId = null;

function getAuthenticatedUserId() {
  if (_cachedUserId) return _cachedUserId;
  const response = ghGraphql(`query { viewer { id } }`, {});
  _cachedUserId = response.viewer.id;
  return _cachedUserId;
}

function updateDraftIssue(draftIssueId, { body }) {
  const response = ghGraphql(
    `mutation($draftIssueId: ID!, $body: String!) {
      updateProjectV2DraftIssue(input: {draftIssueId: $draftIssueId, body: $body}) {
        draftIssue {
          id
          updatedAt
        }
      }
    }`,
    { draftIssueId, body },
  );
  return response.updateProjectV2DraftIssue.draftIssue;
}

function getProjectNodeId(githubProject) {
  if (githubProject.nodeId) return githubProject.nodeId;

  const response = githubProject.ownerType === 'organization'
    ? ghGraphql(
        `query($owner: String!, $number: Int!) {
          organization(login: $owner) {
            projectV2(number: $number) { id }
          }
        }`,
        { owner: githubProject.owner, number: githubProject.number },
      )
    : ghGraphql(
        `query($owner: String!, $number: Int!) {
          user(login: $owner) {
            projectV2(number: $number) { id }
          }
        }`,
        { owner: githubProject.owner, number: githubProject.number },
      );

  return githubProject.ownerType === 'organization'
    ? response.organization.projectV2.id
    : response.user.projectV2.id;
}

function buildTaskCardBody(ecosystem, task, primaryRepository, closeout = null) {
  const repositoryLines = task.repositories.map((repositoryId) => {
    const repository = ecosystem.repositories.find((candidate) => candidate.id === repositoryId);
    const githubFullName = repository
      ? repository.githubFullName || inferGitHubFullName(repository.root)
      : repositoryId;
    return `- [${repositoryId}](https://github.com/${githubFullName})`;
  });

  return [
    '## Ecosystem Task',
    '',
    `- Ecosystem: ${ecosystem.name}`,
    `- Task ID: ${task.id}`,
    `- Scope: ${task.scope || task.id}`,
    `- Primary repository: [${primaryRepository.id}](https://github.com/${primaryRepository.githubFullName})`,
    '',
    '## Repositories',
    '',
    ...repositoryLines,
    '',
    '## Activity',
    '',
    task.body,
    '',
    '## Validation',
    '',
    ...(task.validation && task.validation.length ? task.validation.map((item) => `- ${item}`) : ['- Follow task and repository validation hints.']),
    ...(closeout ? buildCloseoutSection(closeout) : []),
    '',
    '<!-- ecosystem-ai-runner:managed -->',
  ].join('\n');
}

function buildCloseoutSection(closeout) {
  const summary = ensureString(closeout.summary, 'closeout.summary');
  const pullRequests = normalizePullRequests(closeout.pullRequests);
  return [
    '',
    '## Closeout',
    '',
    summary,
    '',
    '## Pull Requests',
    '',
    ...(pullRequests.length ? pullRequests.map((pr) => `- ${pr.repository}: ${pr.url}`) : ['- No pull requests recorded.']),
  ];
}

function normalizePullRequests(value) {
  if (!value) return [];
  if (!Array.isArray(value)) throw new Error('Field "pullRequests" must be an array when provided.');
  return value.map((pr, index) => {
    if (!pr || typeof pr !== 'object' || Array.isArray(pr)) {
      throw new Error(`pullRequests.${index} must be an object.`);
    }
    return {
      repository: ensureString(pr.repository, `pullRequests.${index}.repository`),
      url: ensureString(pr.url, `pullRequests.${index}.url`),
    };
  });
}

function inferGitHubFullName(repositoryRoot) {
  const result = spawnSync('git', ['-C', repositoryRoot, 'config', '--get', 'remote.origin.url'], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`Could not read git remote origin for repository root: ${repositoryRoot}`);
  }

  const remote = result.stdout.trim();
  const sshMatch = remote.match(/^git@github\.com:([^/]+\/[^/]+?)(?:\.git)?$/);
  if (sshMatch) return sshMatch[1];

  const httpsMatch = remote.match(/^https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/);
  if (httpsMatch) return httpsMatch[1];

  throw new Error(`Repository remote origin is not a supported GitHub URL: ${remote}`);
}

function projectEndpoint(githubProject, suffix) {
  if (githubProject.ownerType === 'organization') {
    return `/orgs/${githubProject.owner}/projectsV2/${githubProject.number}/${suffix}`;
  }
  if (githubProject.ownerType === 'user') {
    return `/users/${githubProject.owner}/projectsV2/${githubProject.number}/${suffix}`;
  }
  throw new Error(`Unsupported GitHub Project ownerType: ${githubProject.ownerType}`);
}

function ghApi(method, endpoint, body = null) {
  const args = [
    'api',
    endpoint,
    '--method',
    method,
    '--header',
    'Accept: application/vnd.github+json',
    '--header',
    'X-GitHub-Api-Version: 2026-03-10',
  ];

  const options = { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 };
  if (body !== null) {
    args.push('--input', '-');
    options.input = JSON.stringify(body);
  }

  const result = spawnSync('gh', args, options);
  if (result.status !== 0) {
    const output = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
    throw new Error(`GitHub API call failed (${method} ${endpoint}): ${output}`);
  }

  const stdout = result.stdout.trim();
  return stdout ? JSON.parse(stdout) : null;
}

function ghGraphql(query, variables) {
  const args = ['api', 'graphql', '-f', `query=${query}`];
  for (const [key, value] of Object.entries(variables || {})) {
    if (Array.isArray(value)) {
      args.push('-f', `${key}=${JSON.stringify(value)}`);
    } else {
      args.push(typeof value === 'number' || typeof value === 'boolean' ? '-F' : '-f', `${key}=${value}`);
    }
  }
  const result = spawnSync('gh', args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 });
  if (result.status !== 0) {
    const output = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
    throw new Error(`GitHub GraphQL call failed: ${output}`);
  }
  const parsed = JSON.parse(result.stdout);
  if (parsed.errors && parsed.errors.length) {
    throw new Error(`GitHub GraphQL call failed: ${parsed.errors.map((error) => error.message).join('; ')}`);
  }
  return parsed.data;
}

function projectItemUrl(githubProject, itemId) {
  return `${githubProject.url}?pane=issue&itemId=${itemId}`;
}

function normalizeName(value) {
  return ensureString(String(value), 'name').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function normalizeOptionName(option) {
  return normalizeName(optionName(option));
}

function optionName(option) {
  if (typeof option.name === 'string') return option.name;
  if (option.name && typeof option.name.raw === 'string') return option.name.raw;
  if (option.name && typeof option.name.html === 'string') return option.name.html;
  return String(option.id);
}

module.exports = {
  BOARD_STATUS,
  createTaskCard,
  moveTaskCard,
  updateTaskCardCloseout,
  inferGitHubFullName,
  buildTaskCardBody,
};
