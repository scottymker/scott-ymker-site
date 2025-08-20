// scripts/set-student-meta.mjs
import { getStore } from '@netlify/blobs';

const [, , code, grade, teacher, ...schoolParts] = process.argv;
if (!code) {
  console.error('Usage: node scripts/set-student-meta.mjs CODE [grade] [teacher] [school ...]');
  process.exit(1);
}
const school = schoolParts.join(' ').trim();

const siteID = process.env.NETLIFY_SITE_ID;
const token  = process.env.NETLIFY_AUTH_TOKEN;

if (!siteID || !token) {
  console.error('Missing NETLIFY_SITE_ID and/or NETLIFY_AUTH_TOKEN in this shell.');
  console.error('Export them, then retry.');
  process.exit(1);
}

// Pass creds explicitly so it works locally
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
