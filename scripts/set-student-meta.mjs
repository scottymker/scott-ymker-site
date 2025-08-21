#!/usr/bin/env node
// Update a student's extra metadata (grade/teacher/school) in Netlify Blobs.
//
// Usage:
//   node scripts/set-student-meta.mjs CODE [grade] [teacher] [school ...]
//   node scripts/set-student-meta.mjs CODE [grade] [teacher] [school ...] \
//     --site SITE_ID --token NETLIFY_AUTH_TOKEN [--debug]

import { createClient } from '@netlify/blobs';

const argv = process.argv.slice(2);

// read from env by default; can be overridden by flags
let siteID = process.env.NETLIFY_SITE_ID || '';
let token  = process.env.NETLIFY_AUTH_TOKEN || '';
let debug = false;

const positionals = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--site')  { siteID = argv[++i] || ''; continue; }
  if (a === '--token') { token  = argv[++i] || ''; continue; }
  if (a === '--debug') { debug = true; continue; }
  positionals.push(a);
}

const [code, grade, teacher, ...schoolParts] = positionals;
const school = (schoolParts || []).join(' ').trim();

if (!code) {
  console.error('Usage: node scripts/set-student-meta.mjs CODE [grade] [teacher] [school ...] [--site SITE_ID --token TOKEN] [--debug]');
  process.exit(1);
}

if (!siteID || !token) {
  console.error('Missing NETLIFY_SITE_ID and/or NETLIFY_AUTH_TOKEN. Export them or pass --site/--token.');
  process.exit(1);
}

if (debug) {
  console.error('DEBUG site len', siteID.length, 'token len', token.length);
}

try {
  // IMPORTANT: create a client explicitly when running outside Netlify Functions
  const client = createClient({ siteID, token });        // <-- this is the fix
  const meta = client.getStore({ name: 'meta' });        // site-scoped store

  const key = `students/${code.toUpperCase()}.json`;

  const current = (await meta.get(key, { type: 'json', consistency: 'strong' })) || {};
  const updated = { ...current };
  if (typeof grade   !== 'undefined' && grade !== '') updated.grade   = grade;
  if (typeof teacher !== 'undefined' && teacher)      updated.teacher = teacher;
  if (typeof school  !== 'undefined' && school)       updated.school  = school;

  await meta.set(key, JSON.stringify(updated), { contentType: 'application/json' });
  console.log('Updated', key, updated);
} catch (err) {
  console.error('Failed to update meta:', err?.message || err);
  process.exit(1);
}
