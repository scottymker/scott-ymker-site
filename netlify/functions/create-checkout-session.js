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

  // --- Pricing tables (amounts are cents) ---
  const packagePrices = {
    A: 3200, A1: 4100,
    B: 2700, B1: 3200,
    C: 2200, C1: 2700,
    D: 1800, D1: 2300,
    E: 1200, E1: 1700,
  };

  const addonPrices = {
    F: 600,  // 8x10 Print ($6)
    G: 600,  // 2x 5x7 Prints ($6)
    H: 600,  // 4x 3½x5 Prints ($6)
    I: 1800, // 24 Wallets ($18)
    J: 600,  // 8 Wallets ($6)
    K: 600,  // 16 Mini Wallets ($6)
    L: 700,  // Retouching ($7)
    M: 800,  // 8x10 Class Composite ($8)
    N: 1500, // Digital File ($15)
  };

  // Build line_items in a flexible way: use provided line_items OR compute from package/addons
  let line_items = Array.isArray(body.line_items) && body.line_items.length ? body.line_items : null;

  if (!line_items) {
    const pkg = body.package;
    const addons = Array.isArray(body.addons)
      ? body.addons
      : body.addons ? [body.addons] : [];

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

  if (!Array.isArray(line_items) || line_items.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing or invalid line_items' }) };
  }

  // Merge metadata from the body + top-level fields
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
    // if addons were sent as codes, join them for easy reading in Stripe
    addons: Array.isArray(body.addons) ? body.addons.join(', ') : (body.metadata || {}).addons,
  };

  // Stripe Checkout session payload
  const stripePayload = {
    mode: 'payment',
    payment_method_types: ['card'],
    success_url: 'https://schools.scottymkerphotos.com/success.html',
    cancel_url:  'https://schools.scottymkerphotos.com/cancel.html',
    phone_number_collection: { enabled: true },
    customer_email: body.email || body.parent_email || undefined,
    line_items,
    metadata: mergedMetadata,
  };

  try {
    // Use native fetch on Netlify’s Node runtime
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stripePayload),
    });

    const text = await res.text();
    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: 'Stripe error', details: text }) };
    }

    const session = JSON.parse(text);
    return {
      statusCode: 200,
      body: JSON.stringify({ id: session.id, url: session.url }),
    };
  } catch (err) {
    console.error('Stripe Checkout Session Error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create checkout session' }) };
    }
};
