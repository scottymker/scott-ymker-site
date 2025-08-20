#!/usr/bin/env node
// Update a student's extra metadata (grade / teacher / school) in Netlify Blobs.
//
// Usage:
//   node scripts/set-student-meta.mjs CODE [grade] [teacher] [school ...]
//   node scripts/set-student-meta.mjs CODE [grade] [teacher] [school ...] \
//     --site SITE_ID --token NETLIFY_AUTH_TOKEN [--debug]

import { getStore } from '@netlify/blobs';

const argv = process.argv.slice(2);

let siteID = process.env.NETLIFY_SITE_ID || '';
let token  = process.env.NETLIFY_AUTH_TOKEN || '';
let debug  = false;

const positionals = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--site')  { siteID = argv[++i] || ''; continue; }
  if (a === '--token') { token  = argv[++i] || ''; continue; }
  if (a === '--debug') { debug  = true; continue; }
  positionals.push(a);
}

const [code, grade, teacher, ...schoolParts] = positionals;
const school = (schoolParts || []).join(' ').trim();

if (!code) {
  console.error('Usage: node scripts/set-student-meta.mjs CODE [grade] [teacher] [school ...] [--site SITE_ID --token TOKEN] [--debug]');
  process.exit(1);
}

if (debug) {
  console.error('DEBUG site present?', Boolean(siteID), 'length', siteID?.length ?? 0);
  console.error('DEBUG token present?', Boolean(token), 'length', token?.length ?? 0);
}

if (!siteID || !token) {
  console.error('Missing NETLIFY_SITE_ID and/or NETLIFY_AUTH_TOKEN. Export them or pass --site/--token.');
  process.exit(1);
}

// Belt & suspenders: some lib versions only read from env
process.env.NETLIFY_SITE_ID     = siteID;
process.env.NETLIFY_AUTH_TOKEN  = token;

// Create the store — prefer object signature; fall back to legacy
let meta;
try {
  meta = getStore({ name: 'meta', siteID, token });   // modern signature
} catch (_) {
  meta = getStore('meta', { siteID, token });         // older signature
}

const key = `students/${code}.json`;
const current = (await meta.get(key, { type: 'json', consistency: 'strong' })) || {};
const updated = { ...current };

if (typeof grade   !== 'undefined' && grade !== '') updated.grade   = grade;
if (typeof teacher !== 'undefined' && teacher)      updated.teacher = teacher;
if (typeof school  !== 'undefined' && school)       updated.school  = school;

await meta.set(key, JSON.stringify(updated), { contentType: 'application/json' });
console.log('Updated', key, updated);
