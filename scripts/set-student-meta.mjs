// scripts/set-student-meta.mjs
import { getStore } from '@netlify/blobs';

// Usage:
//   node scripts/set-student-meta.mjs CODE [grade] [teacher] [school ...]
//   node scripts/set-student-meta.mjs CODE [grade] [teacher] [school ...] --site SITEID --token TOKEN

const argv = process.argv.slice(2);

// small helper to read flags
const flag = (name) => {
  const i = argv.indexOf(name);
  return i > -1 ? argv[i + 1] : undefined;
};

// strip flags from positionals
const positionals = argv.filter((a, i) => !['--site', '--token'].includes(a) && argv[i - 1] !== '--site' && argv[i - 1] !== '--token');

const [code, grade, teacher, ...schoolParts] = positionals;
const school = (schoolParts || []).join(' ').trim();

if (!code) {
  console.error('Usage: node scripts/set-student-meta.mjs CODE [grade] [teacher] [school ...] [--site SITEID --token TOKEN]');
  process.exit(1);
}

const siteID = process.env.NETLIFY_SITE_ID || flag('--site');
const token  = process.env.NETLIFY_AUTH_TOKEN || flag('--token');

if (!siteID || !token) {
  console.error('Missing NETLIFY_SITE_ID and/or NETLIFY_AUTH_TOKEN. Export them, or pass --site and --token.');
  process.exit(1);
}

// IMPORTANT: pass credentials explicitly so it works outside Netlify Functions
const meta = getStore('meta', { siteID, token });

const key = `students/${code}.json`;
const current = (await meta.get(key, { type: 'json', consistency: 'strong' })) || {};

const updated = {
  ...current,
  ...(grade   ? { grade }   : {}),
  ...(teacher ? { teacher } : {}),
  ...(school  ? { school }  : {}),
};

await meta.set(key, JSON.stringify(updated), { contentType: 'application/json' });

console.log('Updated', key, updated);
