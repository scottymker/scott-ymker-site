// netlify/functions/preview.mjs
import { getStore } from '@netlify/blobs';

// Optional: simple auth via session cookie if you want it. For now, public.
export default async (req) => {
  const url = new URL(req.url);
  const key = url.searchParams.get('key') || '';
  if (!key || key.includes('..')) {
    return new Response('Bad key', { status: 400 });
  }

  // Your image bytes live in the "galleries" store (metadata is in "meta")
  const galleries = getStore('galleries');

  // Stream the image; falls back to 404 if not present
  const stream = await galleries.get(key, { type: 'stream', consistency: 'strong' });
  if (!stream) return new Response('Not found', { status: 404 });

  // Best-effort content-type
  const ct = key.endsWith('.jpg') || key.endsWith('.jpeg') ? 'image/jpeg'
          : key.endsWith('.png') ? 'image/png'
          : key.endsWith('.webp') ? 'image/webp'
          : 'application/octet-stream';

  return new Response(stream, {
    headers: {
      'Content-Type': ct,
      // small cache—feel free to adjust
      'Cache-Control': 'public, max-age=300'
    }
  });
};
