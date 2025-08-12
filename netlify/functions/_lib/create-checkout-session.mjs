import Stripe from 'stripe';
import { getStore } from '@netlify/blobs';
import { verifyJWT } from './_lib/jwt.mjs';
import { PRICE_MAP } from './_lib/price-map.mjs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async (req) => {
  try {
    const cookie = req.headers.get('cookie') || '';
    const token = /(?:^|; )reorder=([^;]+)/.exec(cookie)?.[1];
    if (!token) return new Response('unauthorized', { status: 401 });
    const { code } = verifyJWT(decodeURIComponent(token), process.env.JWT_SECRET);

    const { package: pkg, addons = [] } = await req.json();
    if (!pkg) return new Response('Missing package', { status: 400 });

    const store = getStore();
    const meta = await store.get(`meta/students/${code}.json`, { type: 'json' });
    if (!meta) return new Response('not found', { status: 404 });

    // Build line items
    const line_items = [];
    const p = PRICE_MAP[pkg];
    if (!p) return Response.json({ error: `Missing price for ${pkg}` }, { status: 400 });
    line_items.push({ price: p, quantity: 1 });
    for (const a of addons) {
      const pr = PRICE_MAP[a];
      if (pr) line_items.push({ price: pr, quantity: 1 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${process.env.SITE_BASE_URL}/thank-you.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_BASE_URL}/gallery.html`,
      metadata: {
        student_code: code,
        student_label: meta.student_label,
        event_label: meta.event_label,
      }
    });

    return Response.json({ url: session.url });
  } catch (e) {
    return Response.json({ error: e.message || 'error' }, { status: 500 });
  }
};
