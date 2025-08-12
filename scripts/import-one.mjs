// Usage:
// NETLIFY_AUTH_TOKEN=... NETLIFY_SITE_ID=... \
// node scripts/import-one.mjs --code ABC123 --event "Fall Picture Day" --first "Avery" --last "Young" --file ./sample/Avery.jpg

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { getStore } from '@netlify/blobs';

const args = Object.fromEntries(process.argv.slice(2).reduce((a,v,i,arr)=>{
  if(v.startsWith('--')) a.push([v.slice(2), arr[i+1] && !arr[i+1].startsWith('--') ? arr[i+1] : 'true']); return a;
},[]));

const { code, event: eventName, first, last, file } = args;
if (!process.env.NETLIFY_AUTH_TOKEN || !process.env.NETLIFY_SITE_ID) throw new Error('Set NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID');
if (!code || !eventName || !first || !last || !file) throw new Error('Missing --code --event --first --last --file');

const previews = getStore({ name:'previews', siteID:process.env.NETLIFY_SITE_ID, token:process.env.NETLIFY_AUTH_TOKEN });
const meta = getStore({ name:'meta', siteID:process.env.NETLIFY_SITE_ID, token:process.env.NETLIFY_AUTH_TOKEN });

const base = path.basename(file).replace(/\.(jpg|jpeg|png)$/i,'');
const prevKey = `galleries/${code}/${base}_preview.jpg`;

const previewBuf = await sharp(file).rotate().resize({ width: 1600, fit:'inside', withoutEnlargement:true })
  .jpeg({ quality: 82 }).toBuffer();
await previews.set(prevKey, previewBuf, { metadata:{ contentType:'image/jpeg' } });

await meta.set(`students/${code}.json`, JSON.stringify({
  code, eventName,
  studentLabel: `${first} ${last[0]}.`,
  previewKeys: [prevKey]
}), {});

console.log('Seeded', code, '→', prevKey);
