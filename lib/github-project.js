'use strict';

function normalizeGitHubProjectConfig(value) {
  if (value === undefined || value === null) return null;

  const rawConfig = typeof value === 'string' ? { url: value } : value;

  if (!rawConfig || typeof rawConfig !== 'object' || Array.isArray(rawConfig)) {
    throw new Error('Field "githubProject" must be an object with a url.');
  }

  if (typeof rawConfig.url !== 'string' || rawConfig.url.trim().length === 0) {
    throw new Error('Field "githubProject.url" is required when githubProject is provided.');
  }

  const url = rawConfig.url.trim();
  const parsed = parseGitHubProjectUrl(url);

  return {
    ...rawConfig,
    url,
    ownerType: rawConfig.ownerType || parsed.ownerType,
    owner: rawConfig.owner || parsed.owner,
    number: rawConfig.number || parsed.number,
  };
}

function parseGitHubProjectUrl(url) {
  let parsed;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid GitHub Project URL: ${url}`);
  }

  if (parsed.hostname !== 'github.com') {
    throw new Error(`GitHub Project URL must use github.com: ${url}`);
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  const [scope, owner, projectsSegment, numberSegment] = segments;
  const isSupportedScope = scope === 'orgs' || scope === 'users';

  if (!isSupportedScope || !owner || projectsSegment !== 'projects' || !numberSegment) {
    throw new Error(
      'GitHub Project URL must look like https://github.com/orgs/<org>/projects/<number> ' +
        'or https://github.com/users/<user>/projects/<number>.',
    );
  }

  const number = Number(numberSegment);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`GitHub Project URL must include a positive project number: ${url}`);
  }

  return {
    ownerType: scope === 'orgs' ? 'organization' : 'user',
    owner,
    number,
  };
}

module.exports = { normalizeGitHubProjectConfig, parseGitHubProjectUrl };
