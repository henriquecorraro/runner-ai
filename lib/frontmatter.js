'use strict';

const fs = require('node:fs');

function parseScalar(rawValue) {
  const value = rawValue.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    if (value.startsWith('"')) {
      try { return JSON.parse(value); } catch { return value.slice(1, -1); }
    }
    return value.slice(1, -1);
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

function parseFrontmatter(frontmatter) {
  const result = {};
  let currentArrayKey = null;

  for (const rawLine of frontmatter.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (line.trim().length === 0) continue;

    const arrayItemMatch = line.match(/^\s*-\s+(.*)$/);
    if (arrayItemMatch) {
      if (!currentArrayKey) throw new Error(`Invalid frontmatter array item without key: "${line}"`);
      result[currentArrayKey].push(parseScalar(arrayItemMatch[1]));
      continue;
    }

    const keyMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!keyMatch) throw new Error(`Unsupported frontmatter line: "${line}"`);

    const [, key, rawValue] = keyMatch;
    if (rawValue.trim().length === 0) {
      result[key] = [];
      currentArrayKey = key;
    } else {
      result[key] = parseScalar(rawValue);
      currentArrayKey = null;
    }
  }
  return result;
}

function formatScalar(value) {
  const stringValue = String(value);
  if (/^[A-Za-z0-9_.:/ -]+$/.test(stringValue)) return stringValue;
  return JSON.stringify(stringValue);
}

function formatArray(key, values) {
  if (!values.length) return [];
  return [`${key}:`, ...values.map((v) => `  - ${formatScalar(v)}`)];
}

function formatOptionalScalar(key, value) {
  if (value === undefined || value === null || String(value).trim().length === 0) return [];
  return [`${key}: ${formatScalar(value)}`];
}

function parseTaskFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error(`Task file must start with YAML frontmatter: ${filePath}`);

  const path = require('node:path');
  const metadata = parseFrontmatter(match[1]);
  const fileName = path.basename(filePath);
  const id = String(metadata.id || fileName.replace(/\.md$/, ''));

  return {
    id,
    title: String(metadata.title || id),
    scope: metadata.scope ? String(metadata.scope) : null,
    status: String(metadata.status || 'open').toLowerCase(),
    repositories: Array.isArray(metadata.repositories) ? metadata.repositories.map(String) : [],
    validation: Array.isArray(metadata.validation) ? metadata.validation.map(String) : [],
    docsTargets: Array.isArray(metadata.docs_targets) ? metadata.docs_targets.map(String) : [],
    dependsOn: Array.isArray(metadata.depends_on) ? metadata.depends_on.map(String) : [],
    githubIssueRepo: metadata.github_issue_repo ? String(metadata.github_issue_repo) : null,
    githubIssueId: metadata.github_issue_id ? Number(metadata.github_issue_id) : null,
    githubIssueNumber: metadata.github_issue_number ? Number(metadata.github_issue_number) : null,
    githubIssueUrl: metadata.github_issue_url ? String(metadata.github_issue_url) : null,
    githubIssueNodeId: metadata.github_issue_node_id ? String(metadata.github_issue_node_id) : null,
    githubDraftIssueNodeId: metadata.github_draft_issue_node_id ? String(metadata.github_draft_issue_node_id) : null,
    githubProjectItemId: metadata.github_project_item_id ? Number(metadata.github_project_item_id) : null,
    githubProjectItemNodeId: metadata.github_project_item_node_id ? String(metadata.github_project_item_node_id) : null,
    githubProjectItemUrl: metadata.github_project_item_url ? String(metadata.github_project_item_url) : null,
    githubProjectStatus: metadata.github_project_status ? String(metadata.github_project_status) : null,
    body: match[2].trim(),
    fileName,
    filePath,
    relativePath: fileName,
  };
}

function buildTaskMarkdown(task) {
  return [
    '---',
    `id: ${formatScalar(task.id)}`,
    `title: ${formatScalar(task.title)}`,
    `scope: ${formatScalar(task.scope)}`,
    `status: ${formatScalar(task.status)}`,
    ...formatArray('repositories', task.repositories),
    ...formatArray('validation', task.validation),
    ...formatArray('docs_targets', task.docsTargets),
    ...formatArray('depends_on', task.dependsOn),
    ...formatOptionalScalar('github_issue_repo', task.githubIssueRepo),
    ...formatOptionalScalar('github_issue_id', task.githubIssueId),
    ...formatOptionalScalar('github_issue_number', task.githubIssueNumber),
    ...formatOptionalScalar('github_issue_url', task.githubIssueUrl),
    ...formatOptionalScalar('github_issue_node_id', task.githubIssueNodeId),
    ...formatOptionalScalar('github_draft_issue_node_id', task.githubDraftIssueNodeId),
    ...formatOptionalScalar('github_project_item_id', task.githubProjectItemId),
    ...formatOptionalScalar('github_project_item_node_id', task.githubProjectItemNodeId),
    ...formatOptionalScalar('github_project_item_url', task.githubProjectItemUrl),
    ...formatOptionalScalar('github_project_status', task.githubProjectStatus),
    '---',
    '',
    task.body.trim(),
    '',
  ].join('\n');
}

module.exports = { parseFrontmatter, parseTaskFile, buildTaskMarkdown, formatScalar, formatArray, formatOptionalScalar };
