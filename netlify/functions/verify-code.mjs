import { getStore } from '@netlify/blobs';

export default async (req) => {
  try {
    const { code } = await req.json();
    const safe = (code || '').toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '');
    if (safe.length !== 6) return new Response('Bad code', { status: 400 });

    const meta = getStore('meta');
    const student = await meta.get(`students/${safe}.json`, { type: 'json', consistency: 'strong' });
    if (!student) return new Response('Not found', { status: 404 });

    const payload = { c: safe, e: Date.now() + 60 * 60 * 1000 };
    const value = Buffer.from(JSON.stringify(payload)).toString('base64url');

    const cookie = [
      `sesh=${value}`,
      'Path=/',
      'HttpOnly',
      'Max-Age=3600',
      'SameSite=Lax',
      'Secure'                 // ✅ helps cookie stick on HTTPS
    ].join('; ');

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie
      }
    });
  } catch {
    return new Response('Bad request', { status: 400 });
  }
};
