// No Stripe SDK required – uses native fetch to hit Stripe's REST API
exports.handler = async (event) => {
  try {
    const id = event.queryStringParameters?.session_id;
    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing session_id" }) };
    }

    const url = `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}?expand[]=line_items`;

    const resp = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    const data = await resp.json();

    if (!resp.ok) {
      // bubble Stripe's error details
      return { statusCode: resp.status, body: JSON.stringify({ error: data?.error || data }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (err) {
    console.error("get-session error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Server error" }) };
  }
};
