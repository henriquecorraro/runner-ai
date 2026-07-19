'use strict';

const { spawnSync } = require('node:child_process');
const { ensureString } = require('./utils');

const BOARD_STATUS = {
  todo: 'Todo',
  inProgress: 'In Progress',
  testing: 'Testing',
  done: 'Done',
};

function createTaskCard(ws, task) {
  if (!ws.githubProject) return { enabled: false, reason: 'githubProject not configured' };

  const plan = prepareTaskCreationPlan(ws, task);
  const issues = [];
  let projectItem = null;

  try {
    const body = buildTaskCardBody(ws, task, plan.primaryRepository);
    for (const repository of plan.repositories) {
      issues.push(createRepositoryIssue(repository.githubFullName, {
        title: task.title,
        body,
        assignee: plan.currentUser.login,
      }));
    }

    const primaryIssue = issues[0];
    projectItem = addIssueToProject(plan.projectId, primaryIssue.nodeId);
    const itemDatabaseId = requireProjectItemDatabaseId(projectItem);
    const status = updateProjectItemStatusByResolvedOption(ws.githubProject, itemDatabaseId, plan.todoStatus);
    setProjectItemCreatedAt(ws.githubProject, itemDatabaseId);
    const projectUrl = projectItemUrl(ws.githubProject, itemDatabaseId);
    const linkedBody = buildTaskCardBody(ws, task, plan.primaryRepository, null, {
      issues,
      projectItemUrl: projectUrl,
    });

    for (const issue of issues) {
      updateIssue(issue.nodeId, { body: linkedBody });
    }

    return {
      enabled: true,
      primaryIssue,
      issues,
      projectItem: {
        id: itemDatabaseId,
        nodeId: projectItem.id,
        url: projectUrl,
        status,
      },
    };
  } catch (error) {
    rollbackTaskCreation({ ws, projectItem, issues, cause: error });
  }
}

function moveTaskCard(ws, task, statusName) {
  if (!ws.githubProject) return { enabled: false, reason: 'githubProject not configured' };
  if (!task.githubProjectItemId) {
    throw new Error(`Task "${task.id}" does not have github_project_item_id frontmatter.`);
  }

  const status = updateProjectItemStatusById(ws.githubProject, task.githubProjectItemId, statusName);
  if (statusName === BOARD_STATUS.done) {
    setProjectItemClosedAt(ws.githubProject, task.githubProjectItemId);
  }
  return { enabled: true, task: task.id, status };
}

function updateTaskCardCloseout(ws, task, closeout) {
  if (!ws.githubProject) return { enabled: false, reason: 'githubProject not configured' };

  const primaryRepository = resolvePrimaryRepository(ws, task);
  const issueUrls = task.githubIssueUrls && task.githubIssueUrls.length
    ? task.githubIssueUrls
    : [task.githubIssueUrl].filter(Boolean);
  const body = buildTaskCardBody(ws, task, primaryRepository, closeout, {
    issueUrls,
    projectItemUrl: task.githubProjectItemUrl,
  });
  const issueNodeId = task.githubIssueNodeId || task.githubDraftIssueNodeId;
  if (!issueNodeId) {
    throw new Error(`Task "${task.id}" does not have GitHub issue or draft issue frontmatter.`);
  }

  if (task.githubIssueNodeId) {
    const issues = updateAndCloseRepositoryIssues(issueUrls, body);
    const updated = issues.find((issue) => issue.nodeId === task.githubIssueNodeId) || updateIssue(issueNodeId, { body });
    return {
      enabled: true,
      issueNodeId: updated.id || updated.nodeId,
      updatedAt: updated.updatedAt,
      issues,
    };
  }

  const updated = updateDraftIssue(issueNodeId, { body });
  return {
    enabled: true,
    issueNodeId: updated.id,
    updatedAt: updated.updatedAt,
  };
}

function updateAndCloseRepositoryIssues(issueUrls, body) {
  if (!issueUrls.length) throw new Error('Task has no github_issue_urls or github_issue_url frontmatter.');

  const seen = new Set();
  return issueUrls.map((url) => {
    const issue = parseGitHubIssueUrl(url);
    const key = `${issue.repo}#${issue.number}`;
    if (seen.has(key)) return null;
    seen.add(key);

    const updated = ghApi('PATCH', `/repos/${issue.repo}/issues/${issue.number}`, {
      body,
      state: 'closed',
      state_reason: 'completed',
    });
    return {
      repo: issue.repo,
      number: issue.number,
      url: updated.html_url,
      state: updated.state,
      nodeId: updated.node_id,
      updatedAt: updated.updated_at,
    };
  }).filter(Boolean);
}

function parseGitHubIssueUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid GitHub issue URL: ${url}`);
  }

  if (parsed.hostname !== 'github.com') {
    throw new Error(`GitHub issue URL must use github.com: ${url}`);
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  const [owner, repoName, issuesSegment, numberSegment] = segments;
  if (!owner || !repoName || issuesSegment !== 'issues' || !numberSegment) {
    throw new Error(`GitHub issue URL must look like https://github.com/<owner>/<repo>/issues/<number>: ${url}`);
  }

  const number = Number(numberSegment);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`GitHub issue URL must include a positive issue number: ${url}`);
  }

  return { repo: `${owner}/${repoName}`, number };
}

function resolvePrimaryRepository(ws, task) {
  return resolveTaskRepositories(ws, task)[0];
}

function resolveTaskRepositories(ws, task) {
  return task.repositories.map((repositoryId) => {
    const repository = ws.repositories.find((repo) => repo.id === repositoryId);
    if (!repository) throw new Error(`Task "${task.id}" references unknown repository "${repositoryId}".`);

    return {
      ...repository,
      githubFullName: repository.githubFullName || inferGitHubFullName(repository.root),
    };
  });
}

function prepareTaskCreationPlan(ws, task) {
  const repositories = resolveTaskRepositories(ws, task);
  if (!repositories.length) throw new Error(`Task "${task.id}" must reference at least one repository.`);

  const currentUser = getAuthenticatedUser();
  if (!currentUser || !currentUser.login) throw new Error('Could not resolve authenticated GitHub user.');

  const projectId = getProjectNodeId(ws.githubProject);
  const todoStatus = resolveProjectStatusOption(ws.githubProject, BOARD_STATUS.todo);

  for (const repository of repositories) {
    assertRepositoryCanCreateAssignedIssue(repository.githubFullName, currentUser.login);
  }

  return {
    repositories,
    primaryRepository: repositories[0],
    currentUser,
    projectId,
    todoStatus,
  };
}

function assertRepositoryCanCreateAssignedIssue(repoFullName, assigneeLogin) {
  let repository;
  try {
    repository = ghApi('GET', `/repos/${repoFullName}`);
  } catch (error) {
    throw new Error(`Cannot access repository "${repoFullName}" before task creation: ${error.message}`);
  }
  if (!repository || repository.has_issues === false) {
    throw new Error(`Repository "${repoFullName}" does not have issues enabled.`);
  }

  try {
    ghApi('GET', `/repos/${repoFullName}/assignees/${assigneeLogin}`);
  } catch (error) {
    throw new Error(`Authenticated GitHub user "${assigneeLogin}" is not assignable in repository "${repoFullName}": ${error.message}`);
  }
}

function createRepositoryIssue(repoFullName, { title, body, assignee }) {
  const payload = {
    title,
    body,
    assignees: assignee ? [assignee] : [],
  };
  const issue = ghApi('POST', `/repos/${repoFullName}/issues`, payload);
  assertCreatedIssue(issue, repoFullName, assignee);
  return {
    repo: repoFullName,
    id: issue.id,
    number: issue.number,
    url: issue.html_url,
    nodeId: issue.node_id,
  };
}

function assertCreatedIssue(issue, repoFullName, assignee) {
  if (!issue || !issue.id || !issue.number || !issue.html_url || !issue.node_id) {
    throw new Error(`GitHub issue creation returned an incomplete response for "${repoFullName}".`);
  }

  const assignees = Array.isArray(issue.assignees) ? issue.assignees.map((item) => item.login) : [];
  if (assignee && !assignees.includes(assignee)) {
    throw new Error(`GitHub issue "${issue.html_url}" was created without required assignee "${assignee}".`);
  }
}

function addIssueToProject(projectId, issueNodeId) {
  const response = ghGraphql(
    `mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
        item {
          id
          fullDatabaseId
        }
      }
    }`,
    { projectId, contentId: issueNodeId },
  );
  const item = response.addProjectV2ItemById && response.addProjectV2ItemById.item;
  if (!item || !item.id || !item.fullDatabaseId) {
    throw new Error('GitHub Project item creation returned an incomplete response.');
  }
  return item;
}

function updateProjectItemDateField(githubProject, itemId, fieldId, date) {
  if (!fieldId) return;
  const endpoint = `${projectEndpoint(githubProject, `items/${itemId}`)}`;
  try {
    ghApi('PATCH', endpoint, { fields: [{ id: fieldId, value: date }] });
  } catch (_) {
    // Date field update is best-effort; do not block task operations.
  }
}

function setProjectItemCreatedAt(githubProject, itemId) {
  const dateFields = githubProject.dateFields;
  if (!dateFields || !dateFields.createdAt) return;
  const today = new Date().toISOString().slice(0, 10);
  updateProjectItemDateField(githubProject, itemId, dateFields.createdAt.id, today);
}

function setProjectItemClosedAt(githubProject, itemId) {
  const dateFields = githubProject.dateFields;
  if (!dateFields || !dateFields.closedAt) return;
  const today = new Date().toISOString().slice(0, 10);
  updateProjectItemDateField(githubProject, itemId, dateFields.closedAt.id, today);
}

function updateProjectItemStatusById(githubProject, itemId, statusName) {
  const status = resolveProjectStatusOption(githubProject, statusName);
  return updateProjectItemStatusByResolvedOption(githubProject, itemId, status);
}

function updateProjectItemStatusByResolvedOption(githubProject, itemId, status) {
  const endpoint = `${projectEndpoint(githubProject, `items/${itemId}`)}`;
  ghApi('PATCH', endpoint, { fields: [{ id: status.fieldId, value: status.optionId }] });
  return {
    fieldId: status.fieldId,
    optionId: status.optionId,
    name: status.optionName,
  };
}

function requireProjectItemDatabaseId(projectItem) {
  const itemDatabaseId = Number(projectItem.fullDatabaseId);
  if (!Number.isInteger(itemDatabaseId) || itemDatabaseId <= 0) {
    throw new Error('GitHub Project item did not return a valid database id.');
  }
  return itemDatabaseId;
}

function rollbackTaskCreation({ ws, projectItem, issues, cause }) {
  const cleanupErrors = [];

  if (projectItem && projectItem.id) {
    try {
      deleteProjectItem(getProjectNodeId(ws.githubProject), projectItem.id);
    } catch (error) {
      cleanupErrors.push(`delete Project item ${projectItem.id}: ${error.message}`);
    }
  }

  for (const issue of issues.slice().reverse()) {
    try {
      addIssueComment(issue.repo, issue.number, buildRollbackComment(cause));
      closeIssue(issue.repo, issue.number);
    } catch (error) {
      cleanupErrors.push(`close ${issue.url}: ${error.message}`);
    }
  }

  const suffix = cleanupErrors.length
    ? ` Rollback attempted but had cleanup errors: ${cleanupErrors.join('; ')}`
    : issues.length || projectItem
      ? ' Rollback completed for created GitHub artifacts.'
      : '';
  throw new Error(`GitHub task creation failed before it could be recorded locally: ${cause.message}.${suffix}`);
}

function deleteProjectItem(projectId, itemId) {
  ghGraphql(
    `mutation($projectId: ID!, $itemId: ID!) {
      deleteProjectV2Item(input: {projectId: $projectId, itemId: $itemId}) {
        deletedItemId
      }
    }`,
    { projectId, itemId },
  );
}

function addIssueComment(repoFullName, issueNumber, body) {
  ghApi('POST', `/repos/${repoFullName}/issues/${issueNumber}/comments`, { body });
}

function closeIssue(repoFullName, issueNumber) {
  ghApi('PATCH', `/repos/${repoFullName}/issues/${issueNumber}`, {
    state: 'closed',
    state_reason: 'not_planned',
  });
}

function buildRollbackComment(cause) {
  return [
    'ws-runner could not complete deterministic task setup.',
    '',
    `Failure: ${cause.message}`,
    '',
    'This issue was closed automatically because the local task was not recorded.',
    '',
    '<!-- ws-runner:rollback -->',
  ].join('\n');
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

let _cachedUser = null;

function getAuthenticatedUser() {
  if (_cachedUser) return _cachedUser;
  const response = ghGraphql(`query { viewer { id login } }`, {});
  _cachedUser = response.viewer;
  return _cachedUser;
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

function updateIssue(issueId, { body }) {
  const response = ghGraphql(
    `mutation($issueId: ID!, $body: String!) {
      updateIssue(input: {id: $issueId, body: $body}) {
        issue {
          id
          updatedAt
        }
      }
    }`,
    { issueId, body },
  );
  return response.updateIssue.issue;
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

  const projectId = githubProject.ownerType === 'organization'
    ? response.organization && response.organization.projectV2 && response.organization.projectV2.id
    : response.user && response.user.projectV2 && response.user.projectV2.id;
  if (!projectId) throw new Error(`Could not resolve GitHub Project node id for ${githubProject.url}.`);
  return projectId;
}

function buildTaskCardBody(ws, task, primaryRepository, closeout = null, links = {}) {
  const repositoryLines = task.repositories.map((repositoryId) => {
    const repository = ws.repositories.find((candidate) => candidate.id === repositoryId);
    const githubFullName = repository
      ? repository.githubFullName || inferGitHubFullName(repository.root)
      : repositoryId;
    return `- [${repositoryId}](https://github.com/${githubFullName})`;
  });

  return [
    '## Workspace Task',
    '',
    `- Workspace: ${ws.name}`,
    `- Task ID: ${task.id}`,
    `- Scope: ${task.scope || task.id}`,
    `- Primary repository: [${primaryRepository.id}](https://github.com/${primaryRepository.githubFullName})`,
    '',
    // Intent section: human-readable context about WHY this task exists
    ...(task.intent ? buildIntentSection(task.intent) : []),
    '## Repositories',
    '',
    ...repositoryLines,
    ...((links.issues && links.issues.length) || (links.issueUrls && links.issueUrls.length) ? buildIssueLinksSection(links) : []),
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
    '<!-- ws-runner:managed -->',
  ].join('\n');
}

function buildIntentSection(intent) {
  return [
    '## Intent',
    '',
    intent,
    '',
  ];
}

function buildIssueLinksSection({ issues, issueUrls, projectItemUrl }) {
  return [
    '',
    '## GitHub Links',
    '',
    ...(projectItemUrl ? [`- Project card: ${projectItemUrl}`] : []),
    ...(issues || []).map((issue) => `- ${issue.repo}#${issue.number}: ${issue.url}`),
    ...(issueUrls || []).map((url) => `- ${url}`),
  ];
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
