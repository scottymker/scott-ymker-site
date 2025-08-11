// netlify/functions/create-checkout-session.js
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  // --- Price tables (cents) ---
  const packagePrices = {
    A: 3200, A1: 4100,
    B: 2700, B1: 3200,
    C: 2200, C1: 2700,
    D: 1800, D1: 2300,
    E: 1200, E1: 1700,
  };

  const addonPrices = {
    F: 600, G: 600, H: 600,
    I: 1800, J: 600, K: 600,
    L: 700,  M: 800, N: 1500,
  };

  // Accept prebuilt line_items OR compute from package/addons
  let line_items = Array.isArray(body.line_items) && body.line_items.length ? body.line_items : null;

  if (!line_items) {
    const pkg = body.package;
    const addons = Array.isArray(body.addons) ? body.addons : (body.addons ? [body.addons] : []);

    if (!pkg || !packagePrices[pkg]) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing or invalid package' }) };
    }

    line_items = [{
      price_data: {
        currency: 'usd',
        product_data: { name: `Package ${pkg}` },
        unit_amount: packagePrices[pkg],
      },
      quantity: 1,
    }];

    for (const a of addons) {
      if (addonPrices[a]) {
        line_items.push({
          price_data: {
            currency: 'usd',
            product_data: { name: `Add-on ${a}` },
            unit_amount: addonPrices[a],
          },
          quantity: 1,
        });
      }
    }
  }

  if (!Array.isArray(line_items) || !line_items.length) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing or invalid line_items' }) };
  }

  // Merge metadata (top-level fields win if present)
  const mergedMetadata = {
    ...(body.metadata || {}),
    background:    body.background    ?? (body.metadata || {}).background,
    student_first: body.student_first ?? (body.metadata || {}).student_first,
    student_last:  body.student_last  ?? (body.metadata || {}).student_last,
    teacher:       body.teacher       ?? (body.metadata || {}).teacher,
    grade:         body.grade         ?? (body.metadata || {}).grade,
    school:        body.school        ?? (body.metadata || {}).school,
    parent_name:   body.parent_name   ?? (body.metadata || {}).parent_name,
    parent_phone:  body.parent_phone  ?? (body.metadata || {}).parent_phone,
    parent_email:  body.parent_email  ?? (body.metadata || {}).parent_email ?? body.email,
    addons: Array.isArray(body.addons) ? body.addons.join(', ') : (body.metadata || {}).addons,
  };

  // Build form-encoded body for Stripe
  const params = new URLSearchParams();
  params.append('mode', 'payment');
  params.append('success_url', 'https://schools.scottymkerphotos.com/success.html');
  params.append('cancel_url',  'https://schools.scottymkerphotos.com/cancel.html');
  params.append('phone_number_collection[enabled]', 'true');

  const email = body.email || body.parent_email;
  if (email) params.append('customer_email', email);

  line_items.forEach((item, i) => {
    const q = item.quantity || 1;
    const { currency, unit_amount, product_data } = item.price_data || {};
    params.append(`line_items[${i}][quantity]`, String(q));
    params.append(`line_items[${i}][price_data][currency]`, String(currency || 'usd'));
    params.append(`line_items[${i}][price_data][unit_amount]`, String(unit_amount || 0));
    params.append(`line_items[${i}][price_data][product_data][name]`, String(product_data?.name || 'Item'));
  });

  Object.entries(mergedMetadata).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      params.append(`metadata[${k}]`, String(v));
    }
  });

  try {
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const text = await res.text(); // keep raw for debugging
    if (!res.ok) {
      // Bubble up Stripe’s error message so we can see it in the Network > Response tab
      return { statusCode: res.status, body: JSON.stringify({ error: 'Stripe error', details: text }) };
    }

    const session = JSON.parse(text);
    return { statusCode: 200, body: JSON.stringify({ id: session.id, url: session.url }) };
  } catch (err) {
    console.error('Stripe Checkout Session Error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create checkout session' }) };
  }
};
