exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const sid = (event.queryStringParameters || {}).sid;
  if (!sid) return { statusCode: 400, body: JSON.stringify({ error: 'Missing sid' }) };

  try {
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sid)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` }
    });
    const text = await res.text();
    if (!res.ok) return { statusCode: res.status, body: text };
    return { statusCode: 200, body: text };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to retrieve session' }) };
  }
};
