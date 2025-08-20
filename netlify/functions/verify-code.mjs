import { getStore } from '@netlify/blobs';

export default async (req, ctx) => {
  const { code } = await req.json();
  const safe = (code || '').toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '');
  if (safe.length !== 6) return new Response('Bad code', { status: 400 });

  const meta = getStore('meta'); // site-scoped store; auth is automatic in functions
  const student = await meta.get(`students/${safe}.json`, { type: 'json', consistency: 'strong' });
  if (!student) return new Response('Not found', { status: 404 });

  // Minimal JWT-ish cookie (HMAC, etc.) — use your existing helper if you have one.
  const payload = { c: safe, s: student.studentLabel, e: Date.now() + 60 * 60 * 1000 };
  const value = Buffer.from(JSON.stringify(payload)).toString('base64url');

  return new Response(null, {
    status: 204,
    headers: {
      'Set-Cookie': `sesh=${value}; HttpOnly; Path=/; Max-Age=3600; SameSite=Lax`,
    },
  });
};
