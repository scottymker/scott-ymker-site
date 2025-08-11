// netlify/functions/create-checkout-session.js

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { Allow: 'POST', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { line_items, metadata } = JSON.parse(event.body || '{}');

    if (!Array.isArray(line_items) || line_items.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing or invalid line_items' }),
      };
    }

    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
    if (!STRIPE_SECRET_KEY) {
      console.error('Missing STRIPE_SECRET_KEY env var');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Server not configured for Stripe' }),
      };
    }

    // Scrub metadata: only keep defined, non-empty values and stringify them
    const scrubbedMeta = {};
    Object.entries(metadata || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && `${v}`.trim() !== '') {
        scrubbedMeta[k] = String(v);
      }
    });

    // Build absolute success/cancel URLs from request headers
    const proto = event.headers['x-forwarded-proto'] || 'https';
    const host =
      event.headers['x-forwarded-host'] ||
      event.headers.host ||
      process.env.URL ||
      '';
    const baseUrl = host ? `${proto}://${host}` : (process.env.URL || '');

    const payload = {
      mode: 'payment',
      success_url: `${baseUrl}/success.html`,
      cancel_url: `${baseUrl}/cancel.html`,
      payment_method_types: ['card'],

      // Prefill the email field (still editable on the Checkout page)
      customer_email: scrubbedMeta.email || undefined,

      // Put metadata on the session…
      metadata: scrubbedMeta,

      // …and ALSO on the PaymentIntent so it appears in the Dashboard's Metadata box
      payment_intent_data: {
        metadata: scrubbedMeta,
      },

      line_items,
    };

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      console.error('Stripe error:', session);
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Stripe error', details: session }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error('Checkout session error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Server error' }),
    };
  }
};
