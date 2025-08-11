// No imports — use native fetch to call Stripe REST API

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "GET") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const id = (event.queryStringParameters && event.queryStringParameters.id) || "";
    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing session id" }) };
    }

    // Ask Stripe for the session and expand line_items in one call
    const url = `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}?expand[]=line_items`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` }
    });
    const session = await res.json();

    if (!res.ok) {
      console.error("Stripe get-session error:", session);
      return { statusCode: 400, body: JSON.stringify(session) };
    }

    // Normalize items
    const items = (session.line_items?.data || []).map((li) => ({
      description: li.description || li.price?.product || "Item",
      quantity: li.quantity || 1,
      amount_total: li.amount_total ?? (li.amount_subtotal ?? 0),
      unit_amount: li.price?.unit_amount ?? null
    }));

    const out = {
      id: session.id,
      currency: session.currency,
      amount_total: session.amount_total,
      customer_email: session.customer_details?.email || session.customer_email,
      customer_phone: session.customer_details?.phone || null,
      metadata: session.metadata || {},
      items
    };

    return { statusCode: 200, body: JSON.stringify(out) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "Server error" }) };
  }
};
