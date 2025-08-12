import { getStore } from '@netlify/blobs';
import { signJWT } from './_lib/jwt.mjs';

export default async (req, context) => {
  try {
    const { code } = await req.json();
    if (!code || !/^[A-HJ-NP-Z2-9]{6}$/.test(code)) return new Response('bad code', { status: 400 });

    const store = getStore();
    const meta = await store.get(`meta/students/${code}.json`, { type: 'json' });
    if (!meta) return new Response('not found', { status: 404 });

    const jwt = signJWT({ code }, process.env.JWT_SECRET, 60 * 60 * 2); // 2h
    const headers = new Headers({ 'content-type': 'application/json' });
    headers.append('Set-Cookie', `reorder=${jwt}; Path=/; HttpOnly; SameSite=Lax; Max-Age=7200; Secure`);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (e) {
    return new Response('error', { status: 500 });
  }
};
