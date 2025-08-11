/* netlify/functions/create-checkout-session.js */
const fetch = require('node-fetch');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
    if (!STRIPE_SECRET_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }) };
    }

    const body = JSON.parse(event.body || '{}');

    // --- Helpers ------------------------------------------------------------
    const pkgPrice = {
      A: 3200, A1: 4100, B: 2700, B1: 3200,
      C: 2200, C1: 2700, D: 1800, D1: 2300,
      E: 1200, E1: 1700
    };
    const addonPrice = {
      F: 600, G: 600, H: 600, I: 1800, J: 600,
      K: 600, L: 700, M: 800, N: 1500
    };

    const ensureArray = (x) => Array.isArray(x) ? x : (x ? [x] : []);
    const selectedAddons = ensureArray(body.addons);
    const selectedPackage = body.package;

    // Accept either prebuilt line_items (from client) or build them here
    let lineItems = [];
    if (Array.isArray(body.line_items) && body.line_items.length) {
      lineItems = body.line_items; // trust prebuilt structure
    } else {
      if (!selectedPackage || !pkgPrice[selectedPackage]) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing or invalid package' }) };
      }
      // Package
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: `Package ${selectedPackage}` },
          unit_amount: pkgPrice[selectedPackage]
        },
        quantity: 1
      });
      // Addons
      selectedAddons.forEach(code => {
        const amount = addonPrice[code];
        if (amount) {
          lineItems.push({
            price_data: {
              currency: 'usd',
              product_data: { name: `Add-on ${code}` },
              unit_amount: amount
            },
            quantity: 1
          });
        }
      });
    }

    // Metadata (what you want to see later in Stripe + webhooks)
    const metadata = {
      student_first: body.student_first || '',
      student_last:  body.student_last  || '',
      teacher:       body.teacher       || '',
      grade:         body.grade         || '',
      school:        body.school        || '',
      parent_name:   body.parent_name   || '',
      parent_phone:  body.parent_phone  || '',
      parent_email:  body.parent_email  || '',
      background:    body.background    || '',
      addons:        ensureArray(body.addons).join(', ')
    };

    // Customer prefill: email (phone is collected by Checkout below)
    const customerEmail =
      (body.email && String(body.email).trim()) ||
      (body.parent_email && String(body.parent_email).trim()) ||
      '';

    // Where to return after success/cancel — build origin so this works on
    // both previews and your custom domain (Cloudflare over Netlify)
    const origin =
      (event.headers['x-forwarded-proto'] ? `${event.headers['x-forwarded-proto']}://` : 'https://') +
      (event.headers['x-forwarded-host'] || event.headers.host || 'schools.scottymkerphotos.com');

    const success_url = `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url  = `${origin}/cancel.html`;

    // Build application/x-www-form-urlencoded payload
    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('success_url', success_url);
    params.append('cancel_url', cancel_url);
    if (customerEmail) params.append('customer_email', customerEmail);
    params.append('phone_number_collection[enabled]', 'true');

    // metadata
    Object.entries(metadata).forEach(([k,v]) => {
      if (v !== undefined && v !== null && String(v).length) {
        params.append(`metadata[${k}]`, String(v));
      }
    });

    // line_items[n][...]
    lineItems.forEach((li, i) => {
      const base = `line_items[${i}]`;
      params.append(`${base}[quantity]`, String(li.quantity || 1));
      const pd = li.price_data || {};
      params.append(`${base}[price_data][currency]`, pd.currency || 'usd');
      params.append(`${base}[price_data][unit_amount]`, String(pd.unit_amount || 0));
      if (pd.product_data && pd.product_data.name) {
        params.append(`${base}[price_data][product_data][name]`, pd.product_data.name);
      }
    });

    // Call Stripe
    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const session = await resp.json();

    if (!resp.ok || session.error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Stripe error', details: session.error || session })
      };
    }

    // Return the Stripe-hosted URL to the client
    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };

  } catch (err) {
    console.error('Checkout error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
