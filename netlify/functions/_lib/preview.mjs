import { getStore } from '@netlify/blobs';
import { verifyJWT } from './_lib/jwt.mjs';

export default async (req) => {
  try {
    const url = new URL(req.url);
    const key = url.searchParams.get('key');
    if (!key) return new Response('missing key', { status: 400 });

    // Optional: require a valid session so previews aren’t crawlable
    const cookie = req.headers.get('cookie') || '';
    const token = /(?:^|; )reorder=([^;]+)/.exec(cookie)?.[1];
    if (!token) return new Response('unauthorized', { status: 401 });
    const { code } = verifyJWT(decodeURIComponent(token), process.env.JWT_SECRET);
    if (!key.includes(`/${code}/`)) return new Response('forbidden', { status: 403 });

    const store = getStore();
    const blob = await store.get(key, { type: 'stream' });
    if (!blob) return new Response('not found', { status: 404 });
    const headers = new Headers({ 'cache-control': 'public, max-age=604800', 'content-type': 'image/jpeg' });
    return new Response(blob, { headers });
  } catch (e) {
    return new Response('error', { status: 500 });
  }
};
