'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const { estimateTokens, truncateToTokenBudget } = require('./token-usage');
const { resolveContainedPath } = require('./utils');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_MARKER = '<!-- ws-runner-context-manifest:v1 -->';

function assembleTaskContext(ws, task, maxTokens) {
  const result = spawnSync(
    'python3',
    ['-m', 'runners.generic.context_cache', 'assemble', '--config', ws.configPath, '--task', task.id, '--max-tokens', String(maxTokens)],
    { cwd: ROOT, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024 * 2 },
  );
  if (result.status === 0) {
    try {
      return JSON.parse(result.stdout);
    } catch (error) {
      throw new Error(`Context cache returned invalid JSON: ${error.message}`);
    }
  }
  const reason = result.error ? result.error.message : (result.stderr || result.stdout || '').trim();
  throw new Error(`Context cache assembly failed: ${reason || `exit ${result.status}`}`);
}

function resolveManifestSource(ws, content) {
  if (!content.trim().startsWith(MANIFEST_MARKER)) return content;
  if (!ws) throw new Error('A workspace is required to resolve a thin context manifest.');
  const manifest = JSON.parse(content.trim().slice(MANIFEST_MARKER.length).trim());
  const sourcePath = resolveContainedPath(ws.wsDir, manifest.sourcePath, 'contextManifest.sourcePath');
  if (!fs.existsSync(sourcePath)) throw new Error(`Context manifest source does not exist: ${sourcePath}`);
  return fs.readFileSync(sourcePath, 'utf8');
}

function fallbackContext(content, maxTokens, ws = null) {
  const resolvedContent = resolveManifestSource(ws, content);
  const page = truncateToTokenBudget(resolvedContent, maxTokens);
  return {
    content: page.content,
    sourceTokens: estimateTokens(resolvedContent),
    includedTokens: page.includedTokens,
    cacheHits: 0,
    cacheMisses: 1,
    fingerprint: null,
    unitIds: [],
    truncated: page.truncated,
    cachePath: null,
  };
}

module.exports = { MANIFEST_MARKER, assembleTaskContext, fallbackContext, resolveManifestSource };
