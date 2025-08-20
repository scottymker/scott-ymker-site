import { getStore } from '@netlify/blobs';

const [, , code, grade, teacher, ...schoolParts] = process.argv;
if (!code) {
  console.error('Usage: node scripts/set-student-meta.mjs CODE [grade] [teacher] [school ...]');
  process.exit(1);
}
const school = schoolParts.join(' ').trim();

const meta = getStore('meta');
const key = `students/${code}.json`;

// Read the existing student JSON and merge new fields
const current = (await meta.get(key, { type: 'json', consistency: 'strong' })) || {};
const updated = {
  ...current,
  // only write if values were provided
  ...(grade   ? { grade }   : {}),
  ...(teacher ? { teacher } : {}),
  ...(school  ? { school }  : {}),
};

// Save back as JSON
await meta.set(key, JSON.stringify(updated), { contentType: 'application/json' });
console.log('Updated', key, updated);
