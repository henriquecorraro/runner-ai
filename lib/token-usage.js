'use strict';

const crypto = require('node:crypto');

const DEFAULT_CHARS_PER_TOKEN = 4;

function estimateTokens(value) {
  const text = value == null ? '' : String(value);
  if (!text) return 0;
  return Math.ceil([...text].length / DEFAULT_CHARS_PER_TOKEN);
}

function truncateToTokenBudget(value, maxTokens) {
  const text = value == null ? '' : String(value);
  if (!Number.isInteger(maxTokens) || maxTokens < 1) {
    throw new Error('maxTokens must be a positive integer.');
  }
  const originalTokens = estimateTokens(text);
  if (originalTokens <= maxTokens) {
    return { content: text, truncated: false, originalTokens, includedTokens: originalTokens, nextOffset: null };
  }
  const maxChars = maxTokens * DEFAULT_CHARS_PER_TOKEN;
  let cut = text.slice(0, maxChars);
  const lastNewline = cut.lastIndexOf('\n');
  if (lastNewline >= Math.floor(maxChars * 0.75)) cut = cut.slice(0, lastNewline + 1);
  return {
    content: cut,
    truncated: true,
    originalTokens,
    includedTokens: estimateTokens(cut),
    nextOffset: cut.length,
  };
}

function pageByTokenBudget(value, offset, maxTokens) {
  const text = value == null ? '' : String(value);
  if (!Number.isInteger(offset) || offset < 0 || offset > text.length) {
    throw new Error(`offset must be an integer between 0 and ${text.length}.`);
  }
  const page = truncateToTokenBudget(text.slice(offset), maxTokens);
  return {
    ...page,
    offset,
    nextOffset: page.truncated ? offset + page.nextOffset : null,
    totalTokens: estimateTokens(text),
    totalCharacters: text.length,
  };
}

function contentHash(value) {
  return crypto.createHash('sha256').update(value == null ? '' : String(value)).digest('hex');
}

module.exports = {
  DEFAULT_CHARS_PER_TOKEN,
  estimateTokens,
  truncateToTokenBudget,
  pageByTokenBudget,
  contentHash,
};
