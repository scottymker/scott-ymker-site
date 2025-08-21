// POST { code, grade, teacher, school } -> 204
import { getStore } from '@netlify/blobs';

export default async (req) => {
  // Optional safety: require a shared secret header to prevent random calls
  const ADMIN_SECRET = process.env.META_ADMIN_SECRET || '';
  if (ADMIN_SECRET && req.headers.get('x-admin-secret') !== ADMIN_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body;
  try { body = await req.json(); } catch { return new Response('Bad JSON', { status: 400 }); }
  const code = (body.code || '').toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '');
  if (!code) return new Response('Missing code', { status: 400 });

  const meta = getStore('meta'); // credentials are injected in Functions
  const key = `students/${code}.json`;
  const current = (await meta.get(key, { type: 'json', consistency: 'strong' })) || {};

  const updated = {
    ...current,
    ...(body.grade   != null && body.grade   !== '' ? { grade:   String(body.grade) } : {}),
    ...(body.teacher != null && body.teacher !== '' ? { teacher: String(body.teacher) } : {}),
    ...(body.school  != null && body.school  !== '' ? { school:  String(body.school) } : {}),
  };

  await meta.set(key, JSON.stringify(updated), { contentType: 'application/json' });
  return new Response(null, { status: 204 });
}
