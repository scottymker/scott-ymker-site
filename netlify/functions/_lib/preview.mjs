import { getStore } from '@netlify/blobs';

export default async (req, ctx) => {
  const key = decodeURIComponent(new URL(req.url).pathname.replace(/^.*\/preview\//, ''));
  if (!key) return new Response('Missing key', { status: 400 });

  const previews = getStore('previews');
  const { data, metadata } = await previews.getWithMetadata(key, { type: 'arrayBuffer' });
  if (!data) return new Response('Not found', { status: 404 });

  return new Response(data, {
    headers: {
      'Content-Type': metadata?.contentType || 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
