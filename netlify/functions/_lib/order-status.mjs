import { getStore } from '@netlify/blobs';

export default async (req) => {
  const url = new URL(req.url);
  const sid = url.searchParams.get('session_id');
  if (!sid) return new Response('missing', { status: 400 });
  const store = getStore();
  const order = await store.get(`orders/${sid}.json`, { type: 'json' });
  if (!order) return Response.json({ status: 'pending' }, { status: 200 });

  // If you sell digitals, you can generate a short-lived signed link via another function.
  // For MVP, just return a placeholder null.
  return Response.json({ status: order.status, download_url: order.download_url || null });
};
