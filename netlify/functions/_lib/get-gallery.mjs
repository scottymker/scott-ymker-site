import { getStore } from '@netlify/blobs';
import { verifyJWT } from './_lib/jwt.mjs';

export default async (req, context) => {
  try {
    const cookie = req.headers.get('cookie') || '';
    const token = /(?:^|; )reorder=([^;]+)/.exec(cookie)?.[1];
    if (!token) return new Response('unauthorized', { status: 401 });
    const { code } = verifyJWT(decodeURIComponent(token), process.env.JWT_SECRET);

    const store = getStore();
    const meta = await store.get(`meta/students/${code}.json`, { type: 'json' });
    if (!meta) return new Response('not found', { status: 404 });

    // Return only safe fields
    return Response.json({
      student_label: meta.student_label, // e.g., "Emma Y."
      event_label: meta.event_label,
      preview_keys: meta.preview_keys,   // e.g., ["previews/Fall2025/AB2DEF/IMG_1234.jpg", ...]
    });
  } catch (e) {
    return new Response('error', { status: 500 });
  }
};
