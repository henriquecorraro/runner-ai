'use strict';

const fs = require('node:fs');
const path = require('node:path');
const TASK_FRONTMATTER_SCHEMA = require('../schemas/task-frontmatter.json');

function parseScalar(rawValue) {
  const value = rawValue.trim();
  if (value.startsWith('[') && value.endsWith(']')) {
    try { return JSON.parse(value); } catch { throw new Error(`Invalid inline frontmatter array: ${value}`); }
  }
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

  const metadata = parseFrontmatter(match[1]);
  validateFrontmatter(metadata, filePath);
  const fileName = path.basename(filePath);
  const id = String(metadata.id || fileName.replace(/\.md$/, ''));

  return {
    id,
    title: String(metadata.title || id),
    scope: metadata.scope ? String(metadata.scope) : null,
    status: String(metadata.status || 'open').toLowerCase(),
    complexity: metadata.complexity ? String(metadata.complexity).toLowerCase() : null,
    risk: metadata.risk ? String(metadata.risk).toLowerCase() : null,
    executionProfile: metadata.execution_profile ? String(metadata.execution_profile).toLowerCase() : null,
    executionAgent: metadata.execution_agent ? String(metadata.execution_agent) : null,
    routingPolicy: metadata.routing_policy ? String(metadata.routing_policy).toLowerCase() : null,
    preferredModel: metadata.preferred_model ? String(metadata.preferred_model) : null,
    reasoningEffort: metadata.reasoning_effort ? String(metadata.reasoning_effort).toLowerCase() : null,
    repositories: Array.isArray(metadata.repositories) ? metadata.repositories.map(String) : [],
    validation: Array.isArray(metadata.validation) ? metadata.validation.map(String) : [],
    docsTargets: Array.isArray(metadata.docs_targets) ? metadata.docs_targets.map(String) : [],
    dependsOn: Array.isArray(metadata.depends_on) ? metadata.depends_on.map(String) : [],
    githubIssueRepo: metadata.github_issue_repo ? String(metadata.github_issue_repo) : null,
    githubIssueId: metadata.github_issue_id ? Number(metadata.github_issue_id) : null,
    githubIssueNumber: metadata.github_issue_number ? Number(metadata.github_issue_number) : null,
    githubIssueUrl: metadata.github_issue_url ? String(metadata.github_issue_url) : null,
    githubIssueNodeId: metadata.github_issue_node_id ? String(metadata.github_issue_node_id) : null,
    githubIssueUrls: Array.isArray(metadata.github_issue_urls) ? metadata.github_issue_urls.map(String) : [],
    githubDraftIssueNodeId: metadata.github_draft_issue_node_id ? String(metadata.github_draft_issue_node_id) : null,
    githubProjectItemId: metadata.github_project_item_id ? Number(metadata.github_project_item_id) : null,
    githubProjectItemNodeId: metadata.github_project_item_node_id ? String(metadata.github_project_item_node_id) : null,
    githubProjectItemUrl: metadata.github_project_item_url ? String(metadata.github_project_item_url) : null,
    githubProjectStatus: metadata.github_project_status ? String(metadata.github_project_status) : null,
    baseBranch: metadata.base_branch ? String(metadata.base_branch) : null,
    createdAt: metadata.created_at ? String(metadata.created_at) : null,
    finishedAt: metadata.finished_at ? String(metadata.finished_at) : null,
    executionState: metadata.execution_state ? String(metadata.execution_state) : null,
    executionRunId: metadata.execution_run_id ? String(metadata.execution_run_id) : null,
    executionBranch: metadata.execution_branch ? String(metadata.execution_branch) : null,
    executionStartedAt: metadata.execution_started_at ? String(metadata.execution_started_at) : null,
    executionFinishedAt: metadata.execution_finished_at ? String(metadata.execution_finished_at) : null,
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
    ...formatOptionalScalar('complexity', task.complexity),
    ...formatOptionalScalar('risk', task.risk),
    ...formatOptionalScalar('execution_profile', task.executionProfile),
    ...formatOptionalScalar('execution_agent', task.executionAgent),
    ...formatOptionalScalar('routing_policy', task.routingPolicy),
    ...formatOptionalScalar('preferred_model', task.preferredModel),
    ...formatOptionalScalar('reasoning_effort', task.reasoningEffort),
    ...formatArray('repositories', task.repositories),
    ...formatArray('validation', task.validation),
    ...formatArray('docs_targets', task.docsTargets),
    ...formatArray('depends_on', task.dependsOn),
    ...formatOptionalScalar('github_issue_repo', task.githubIssueRepo),
    ...formatOptionalScalar('github_issue_id', task.githubIssueId),
    ...formatOptionalScalar('github_issue_number', task.githubIssueNumber),
    ...formatOptionalScalar('github_issue_url', task.githubIssueUrl),
    ...formatOptionalScalar('github_issue_node_id', task.githubIssueNodeId),
    ...formatArray('github_issue_urls', task.githubIssueUrls || []),
    ...formatOptionalScalar('github_draft_issue_node_id', task.githubDraftIssueNodeId),
    ...formatOptionalScalar('github_project_item_id', task.githubProjectItemId),
    ...formatOptionalScalar('github_project_item_node_id', task.githubProjectItemNodeId),
    ...formatOptionalScalar('github_project_item_url', task.githubProjectItemUrl),
    ...formatOptionalScalar('github_project_status', task.githubProjectStatus),
    ...formatOptionalScalar('base_branch', task.baseBranch),
    ...formatOptionalScalar('created_at', task.createdAt),
    ...formatOptionalScalar('finished_at', task.finishedAt),
    ...formatOptionalScalar('execution_state', task.executionState),
    ...formatOptionalScalar('execution_run_id', task.executionRunId),
    ...formatOptionalScalar('execution_branch', task.executionBranch),
    ...formatOptionalScalar('execution_started_at', task.executionStartedAt),
    ...formatOptionalScalar('execution_finished_at', task.executionFinishedAt),
    '---',
    '',
    task.body.trim(),
    '',
  ].join('\n');
}

// --- Atomic write ---

function writeFileAtomic(filePath, content) {
  const tmpPath = filePath + `.tmp.${process.pid}.${Date.now()}`;
  let fileDescriptor;
  try {
    fileDescriptor = fs.openSync(tmpPath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY);
    fs.writeFileSync(fileDescriptor, content);
    fs.fsyncSync(fileDescriptor);
    fs.closeSync(fileDescriptor);
    fileDescriptor = undefined;
    fs.renameSync(tmpPath, filePath);
    const directoryDescriptor = fs.openSync(path.dirname(filePath), fs.constants.O_RDONLY);
    try { fs.fsyncSync(directoryDescriptor); } finally { fs.closeSync(directoryDescriptor); }
  } finally {
    if (fileDescriptor !== undefined) try { fs.closeSync(fileDescriptor); } catch { /* preserve original error */ }
    try { fs.unlinkSync(tmpPath); } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

// --- Schema validation ---

const KNOWN_FRONTMATTER_FIELDS = new Set([
  ...TASK_FRONTMATTER_SCHEMA.scalarFields,
  ...TASK_FRONTMATTER_SCHEMA.arrayFields,
]);

const REQUIRED_FRONTMATTER_FIELDS = TASK_FRONTMATTER_SCHEMA.required;

function validateFrontmatter(metadata, filePath) {
  for (const key of Object.keys(metadata)) {
    if (!KNOWN_FRONTMATTER_FIELDS.has(key)) {
      throw new Error(`Unknown frontmatter field "${key}" in ${path.basename(filePath)}. Known fields: ${[...KNOWN_FRONTMATTER_FIELDS].join(', ')}`);
    }
  }
  for (const field of REQUIRED_FRONTMATTER_FIELDS) {
    if (metadata[field] === undefined || metadata[field] === null || String(metadata[field]).trim().length === 0) {
      throw new Error(`Missing required frontmatter field "${field}" in ${path.basename(filePath)}.`);
    }
  }
  for (const field of TASK_FRONTMATTER_SCHEMA.arrayFields) {
    if (metadata[field] !== undefined && !Array.isArray(metadata[field])) {
      throw new Error(`Frontmatter field "${field}" must be an array in ${path.basename(filePath)}.`);
    }
  }
  for (const field of TASK_FRONTMATTER_SCHEMA.scalarFields) {
    if (metadata[field] !== undefined && Array.isArray(metadata[field])) {
      throw new Error(`Frontmatter field "${field}" must be a scalar in ${path.basename(filePath)}.`);
    }
  }
  const status = String(metadata.status).toLowerCase();
  if (!TASK_FRONTMATTER_SCHEMA.statusValues.includes(status)) {
    throw new Error(`Unsupported task status "${metadata.status}" in ${path.basename(filePath)}.`);
  }
  if (metadata.execution_state !== undefined && !TASK_FRONTMATTER_SCHEMA.executionStateValues.includes(String(metadata.execution_state))) {
    throw new Error(`Unsupported execution state "${metadata.execution_state}" in ${path.basename(filePath)}.`);
  }
  validateEnumField(metadata, filePath, 'complexity', 'complexityValues');
  validateEnumField(metadata, filePath, 'risk', 'riskValues');
  validateEnumField(metadata, filePath, 'execution_profile', 'executionProfileValues');
  validateEnumField(metadata, filePath, 'routing_policy', 'routingPolicyValues');
  validateEnumField(metadata, filePath, 'reasoning_effort', 'reasoningEffortValues');
  const routingPolicy = metadata.routing_policy ? String(metadata.routing_policy).toLowerCase() : 'preferred';
  if (routingPolicy === 'pinned' && !metadata.execution_agent) {
    throw new Error(`Pinned task routing requires execution_agent in ${path.basename(filePath)}.`);
  }
  if (routingPolicy === 'portable') {
    const forbidden = ['execution_agent', 'preferred_model', 'reasoning_effort'].filter((field) => metadata[field]);
    if (forbidden.length) {
      throw new Error(`Portable task routing cannot define ${forbidden.join(', ')} in ${path.basename(filePath)}.`);
    }
  }
}

function validateEnumField(metadata, filePath, fieldName, schemaKey) {
  if (metadata[fieldName] === undefined) return;
  const value = String(metadata[fieldName]).toLowerCase();
  if (!TASK_FRONTMATTER_SCHEMA[schemaKey].includes(value)) {
    throw new Error(`Unsupported ${fieldName} "${metadata[fieldName]}" in ${path.basename(filePath)}.`);
  }
}

module.exports = { parseFrontmatter, parseTaskFile, buildTaskMarkdown, formatScalar, formatArray, formatOptionalScalar, writeFileAtomic, validateFrontmatter, KNOWN_FRONTMATTER_FIELDS };
