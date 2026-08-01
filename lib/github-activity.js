'use strict';

const { spawnSync } = require('node:child_process');

/**
 * Fetch the authenticated user's activity in a GitHub Project filtered by date range.
 * Uses the Project v2 items API with updatedAt filtering.
 */
function getMyActivity(githubProject, { since, until }) {
  const login = getAuthenticatedUser();
  const projectId = getProjectNodeId(githubProject);

  const items = fetchProjectItems(projectId, githubProject);

  const sinceDate = since ? new Date(since) : null;
  let untilDate = until ? new Date(until) : null;
  // When until is a date-only string (no time component), include the entire day
  if (untilDate && until.length <= 10) {
    untilDate = new Date(untilDate.getTime() + 86400000 - 1);
  }

  const filtered = items.filter((item) => {
    const updatedAt = new Date(item.updatedAt);
    if (sinceDate && updatedAt < sinceDate) return false;
    if (untilDate && updatedAt > untilDate) return false;

    // Check if user is the creator or assignee
    const isCreator = item.creator === login;
    const isAssignee = item.assignees.includes(login);
    return isCreator || isAssignee;
  });

  return {
    user: login,
    project: githubProject.url,
    since: since || null,
    until: until || null,
    totalItems: filtered.length,
    items: filtered,
  };
}

function getAuthenticatedUser() {
  const result = spawnSync('gh', ['api', '/user', '--jq', '.login'], { encoding: 'utf8', timeout: 30000 });
  if (result.status !== 0) throw new Error(`Failed to get authenticated user: ${result.error ? result.error.message : result.stderr}`);
  return result.stdout.trim();
}

function getProjectNodeId(githubProject) {
  if (githubProject.nodeId) return githubProject.nodeId;

  const ownerField = githubProject.ownerType === 'organization' ? 'organization' : 'user';
  const query = `query($owner: String!, $number: Int!) {
    ${ownerField}(login: $owner) { projectV2(number: $number) { id } }
  }`;

  const data = ghGraphql(query, { owner: githubProject.owner, number: githubProject.number });
  return data[ownerField].projectV2.id;
}

function fetchProjectItems(projectId, githubProject) {
  const items = [];
  let cursor = null;

  for (;;) {
    const afterClause = cursor ? `, after: "${cursor}"` : '';
    const query = `query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          items(first: 100${afterClause}) {
            pageInfo { hasNextPage endCursor }
            nodes {
              databaseId
              updatedAt
              content {
                __typename
                ... on DraftIssue { title body creator { login } assignees(first: 10) { nodes { login } } }
                ... on Issue { title url state author { login } assignees(first: 10) { nodes { login } } }
                ... on PullRequest { title url state author { login } assignees(first: 10) { nodes { login } } }
              }
              fieldValues(first: 20) {
                nodes {
                  ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2SingleSelectField { name } } }
                }
              }
            }
          }
        }
      }
    }`;

    const data = ghGraphql(query, { projectId });
    const connection = data.node.items;

    for (const node of connection.nodes) {
      const content = node.content;
      if (!content) continue;

      const creator = content.creator?.login || content.author?.login || null;
      const assignees = (content.assignees?.nodes || []).map((a) => a.login);
      const itemId = node.databaseId;
      const cardUrl = `${githubProject.url}/views/1?pane=issue&itemId=${itemId}`;

      // Extract status from field values
      let status = null;
      for (const fv of (node.fieldValues?.nodes || [])) {
        if (fv?.field?.name?.toLowerCase() === 'status' && fv.name) {
          status = fv.name;
          break;
        }
      }

      items.push({
        type: content.__typename,
        title: content.title,
        url: content.url || cardUrl,
        cardUrl,
        itemId,
        status,
        state: content.state || null,
        creator,
        assignees,
        updatedAt: node.updatedAt,
      });
    }

    if (!connection.pageInfo.hasNextPage) break;
    cursor = connection.pageInfo.endCursor;
  }

  return items;
}

function ghGraphql(query, variables) {
  const args = ['api', 'graphql', '-f', `query=${query}`];
  for (const [key, value] of Object.entries(variables || {})) {
    args.push(typeof value === 'number' || typeof value === 'boolean' ? '-F' : '-f', `${key}=${value}`);
  }
  const result = spawnSync('gh', args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10, timeout: 30000 });
  if (result.status !== 0) {
    throw new Error(`GitHub GraphQL call failed: ${[result.error && result.error.message, result.stderr, result.stdout].filter(Boolean).join('\n').trim()}`);
  }
  const parsed = JSON.parse(result.stdout);
  if (parsed.errors?.length) {
    throw new Error(`GitHub GraphQL errors: ${parsed.errors.map((e) => e.message).join('; ')}`);
  }
  return parsed.data;
}

module.exports = { getMyActivity };
