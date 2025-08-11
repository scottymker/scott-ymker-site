// netlify/functions/get-session.js
const Stripe = require('stripe');

exports.handler = async (event) => {
  try {
    const id = event.queryStringParameters?.id;
    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing session id' }) };
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

    const session = await stripe.checkout.sessions.retrieve(id, {
      expand: ['line_items.data.price.product']
    });

    const items = (session.line_items?.data || []).map((li) => ({
      description:
        li.description ||
        li.price?.product?.name ||
        li.price?.nickname ||
        'Item',
      quantity: li.quantity || 1,
      unit_amount: li.price?.unit_amount ?? li.amount_total,
      amount_total: li.amount_total ?? (li.price?.unit_amount || 0) * (li.quantity || 1),
    }));

    const payload = {
      id: session.id,
      amount_total: session.amount_total,
      currency: session.currency,
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email || session.customer_email,
      customer_phone: session.customer_details?.phone || null,
      metadata: session.metadata || {},
      items
    };

    return { statusCode: 200, body: JSON.stringify(payload) };
  } catch (err) {
    console.error('get-session error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to load session' }) };
  }
};
