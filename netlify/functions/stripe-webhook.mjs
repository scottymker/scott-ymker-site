import Stripe from 'stripe';
import { getStore } from '@netlify/blobs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = { path: '/api/stripe-webhook' };

export default async (req) => {
  const sig = req.headers.get('stripe-signature');
  let event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new Response('bad sig', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const store = getStore();

    // Persist a lightweight order record for the thank-you page to read
    await store.set(`orders/${session.id}.json`, JSON.stringify({
      status: 'paid',
      student_code: session.metadata?.student_code,
      student_label: session.metadata?.student_label,
      event_label: session.metadata?.event_label,
      customer_email: session.customer_details?.email || null,
      created: Date.now(),
    }), { contentType: 'application/json' });
  }

  return new Response('ok', { status: 200 });
};
