// netlify/functions/preview.mjs
import { getStore } from '@netlify/blobs';

const TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
};

function guessType(key) {
  const m = key.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif|avif)$/);
  if (!m) return 'application/octet-stream';
  const ext = `.${m[1]}`;
  return TYPES[ext] || 'application/octet-stream';
}

export default async (req) => {
  try {
    const url = new URL(req.url);
    let key = (url.searchParams.get('key') || '').trim();
    if (!key) return new Response('Missing key', { status: 400 });

    // Normalize: the store name is "galleries", so the key should NOT start with "galleries/"
    key = key.replace(/^\/+/, '').replace(/^galleries\//, '');

    const galleries = getStore('galleries');
    const bytes = await galleries.get(key, { type: 'bytes' });

    if (!bytes) return new Response('Not found', { status: 404 });

    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': guessType(key),
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (e) {
    console.error('preview error:', e);
    return new Response('Server error', { status: 500 });
  }
};
