// netlify/functions/preview.mjs
import { getStore } from '@netlify/blobs';

const guessType = (key) => {
  const k = key.toLowerCase();
  if (k.endsWith('.png'))  return 'image/png';
  if (k.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
};

export default async (req) => {
  // accept both /api/preview?key=... and /preview/<key>
  const url = new URL(req.url);
  let key =
    url.searchParams.get('key') ||
    decodeURIComponent(url.pathname.replace(/^.*\/preview\//, ''));

  key = (key || '').replace(/^\/+/, '').replace(/^galleries\//, ''); // <= normalize

  if (!key) {
    return new Response('Missing key', { status: 400 });
  }

  const store = getStore('galleries');
  const stream = await store.get(key, { type: 'stream', consistency: 'strong' });
  if (!stream) return new Response('Not found', { status: 404 });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': guessType(key),
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
