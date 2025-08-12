import { readFile } from 'node:fs/promises';
import { getStore } from '@netlify/blobs';

const SITE = process.env.NETLIFY_SITE_ID;
const TOKEN = process.env.NETLIFY_AUTH_TOKEN;

const previews = getStore({ name: 'previews', siteID: SITE, token: TOKEN });
const originals = getStore({ name: 'originals', siteID: SITE, token: TOKEN });
const meta = getStore({ name: 'meta', siteID: SITE, token: TOKEN });

// Example student
const code = 'ABC123'; // must match your code card
const eventName = 'Fall Picture Day';

const filePath = './sample/AveryY_1_preview.jpg';
const fileKey = `galleries/${code}/AveryY_1_preview.jpg`;
const buf = await readFile(filePath);

await previews.set(fileKey, buf, { metadata: { contentType: 'image/jpeg' } });
// (optional) upload original too:
// await originals.set(`galleries/${code}/AveryY_1.jpg`, await readFile('./sample/AveryY_1.jpg'), { metadata: { contentType: 'image/jpeg' }});

await meta.set(`students/${code}.json`, JSON.stringify({
  code,
  eventName,
  studentLabel: 'Avery Y.',
  previewKeys: [fileKey],
}), { });

console.log('Seeded', code);
