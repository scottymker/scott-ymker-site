// admin-put-preview.mjs
// Upload a local repo image into the "galleries" blob store.
// Writes to BOTH keys so CDN and /api/preview paths will hit.
//
// POST { "code": "THM239", "file": "Thomas.jpg" }
//
// Auth: send header x-admin-secret: s3tTh1s!

import { getStore } from '@netlify/blobs';
import fs from 'node:fs/promises';
import path from 'node:path';

const SECRET = process.env.ADMIN_SECRET || 's3tTh1s!';

export default async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }
    const sent = req.headers.get('x-admin-secret');
    if (sent !== SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { code, file } = await req.json();
    if (!code || !file) {
      return new Response('Missing "code" or "file"', { status: 400 });
    }

    // read the file from the deployed bundle (you’ll include it via included_files below)
    const abs = path.join(process.cwd(), file);
    const buf = await fs.readFile(abs);

    const galleries = getStore('galleries'); // site-scoped

    // write to BOTH key shapes (with and without leading "galleries/")
    const k1 = `${code}/Thomas_preview.jpg`;
    const k2 = `galleries/${code}/Thomas_preview.jpg`;

    await galleries.set(k1, buf, { contentType: 'image/jpeg' });
    await galleries.set(k2, buf, { contentType: 'image/jpeg' });

    // Optional: also ensure meta knows about the key that your frontend uses
    // (not strictly required if it already does).
    // const meta = getStore('meta');
    // await meta.set(`students/${code}.json`, JSON.stringify({ previewKeys:[k2] }), { contentType:'application/json' });

    return new Response(null, { status: 204 });
  } catch (err) {
    console.error(err);
    return new Response('Server error', { status: 500 });
  }
}
