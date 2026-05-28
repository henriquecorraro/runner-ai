'use strict';

const fs = require('node:fs');

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeSearchValue(value) {
  return String(value)
    .toLowerCase()
    .replace(/\.md$/, '')
    .replace(/^\d+-/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function ensureString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Field "${fieldName}" is required.`);
  }
  return value.trim();
}

function ensureStringArray(value, fieldName, required = false) {
  if (value === undefined || value === null) {
    if (required) throw new Error(`Field "${fieldName}" is required.`);
    return [];
  }
  if (!Array.isArray(value)) throw new Error(`Field "${fieldName}" must be an array.`);
  const items = value.map((item) => ensureString(item, fieldName));
  if (required && items.length === 0) throw new Error(`Field "${fieldName}" must contain at least one item.`);
  return items;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { slugify, normalizeSearchValue, ensureString, ensureStringArray, readJson, escapeRegExp };
