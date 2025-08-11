// netlify/functions/create-checkout-session.js

exports.handler = async (event) => {
  if (event.httpMethod && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { Allow: 'POST', 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');

    // --- Prices in cents (authoritative on the server) ---
    const packagePrices = {
      A: 3200, A1: 4100,
      B: 2700, B1: 3200,
      C: 2200, C1: 2700,
      D: 1800, D1: 2300,
      E: 1200, E1: 1700,
    };

    const addonPrices = {
      F: 500,   // 8x10 Print
      G: 800,   // 2x 5x7 Prints
      H: 800,   // 4x 3.5x5 Prints
      I: 1800,  // 24 Wallets
      J: 800,   // 8 Wallets
      K: 800,   // 16 Mini Wallets
      L: 1000,  // Retouching
      M: 1500,  // 8x10 Class Composite
      N: 2000,  // Digital File
    };

    // --- Build line_items ---
    let line_items = Array.isArray(body.line_items) ? body.line_items : [];

    // If the client didn't send line_items, build them here using codes
    if (!Array.isArray(line_items) || line_items.length === 0) {
      const selectedPackage = body.package;
      const selectedAddons = Array.isArray(body.addons)
        ? body.addons
        : (typeof body.addons === 'string'
            ? [body.addons]
            : []);

      const li = [];

      if (selectedPackage && packagePrices[selectedPackage]) {
        li.push({
          price_data: {
            currency: 'usd',
            product_data: { name: `Package ${selectedPackage}` },
            unit_amount: packagePrices[selectedPackage],
          },
          quantity: 1,
        });
      }

      selectedAddons.forEach(code => {
        if (addonPrices[code]) {
          const names = {
            F: '8x10 Print',
            G: '2x 5x7 Prints',
            H: '4x 3.5x5 Prints',
            I: '24 Wallets',
            J: '8 Wallets',
            K: '16 Mini Wallets',
            L: 'Retouching',
            M: '8x10 Class Composite',
            N: 'Digital File',
          };
          li.push({
            price_data: {
              currency: 'usd',
              product_data: { name: `Add-on ${code}${names[code] ? ` — ${names[code]}` : ''}` },
              unit_amount: addonPrices[code],
            },
            quantity: 1,
          });
        }
      });

      line_items = li;
    }

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

    // --- Metadata: accept either body.metadata or individual fields ---
    const metaSource = body.metadata || body || {};
    const metadataRaw = {
      // map both camelCase and snake_case from the client
      student_first: metaSource.student_first || metaSource.studentFirstName,
      student_last:  metaSource.student_last  || metaSource.studentLastName,
      teacher:       metaSource.teacher,
      grade:         metaSource.grade,
      school:        metaSource.school,
      parent_name:   metaSource.parent_name   || metaSource.parentName,
      parent_phone:  metaSource.parent_phone  || metaSource.phone,
      parent_email:  metaSource.parent_email  || metaSource.email,
      background:    metaSource.background,
      // optional: what was ordered
      package:       metaSource.package,
      addons: Array.isArray(metaSource.addons)
        ? metaSource.addons.join(', ')
        : (typeof metaSource.addons === 'string' ? metaSource.addons : undefined),
    };

    // Scrub metadata (Stripe requires string values)
    const scrubbedMeta = {};
    Object.entries(metadataRaw).forEach(([k, v]) => {
      if (v !== undefined && v !== null && `${v}`.trim() !== '') {
        scrubbedMeta[k] = String(v);
      }
    });

    // Build absolute URLs for success/cancel
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

      // Prefill email (still user-editable)
      customer_email:
        metaSource.customer_email ||
        metaSource.email ||
        scrubbedMeta.parent_email ||
        undefined,

      // Put metadata on BOTH the session and the PaymentIntent
      metadata: scrubbedMeta,
      payment_intent_data: { metadata: scrubbedMeta },

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
