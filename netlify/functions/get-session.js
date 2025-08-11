// netlify/functions/get-session.js
export async function handler(event) {
  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      return resp(500, { error: "Missing STRIPE_SECRET_KEY" });
    }

    const id = (event.queryStringParameters && event.queryStringParameters.id) || "";
    if (!id || !id.startsWith("cs_")) {
      return resp(400, { error: "Missing or invalid session_id" });
    }

    // Ask Stripe for the Checkout Session and expand line items
    const url = `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}?expand[]=line_items`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });

    const session = await res.json();
    if (!res.ok) {
      return resp(res.status, { error: session.error?.message || "Stripe error" });
    }

    // Normalize the shape the success page expects
    const items = (session.line_items?.data || []).map((li) => ({
      description: li.description || li.price?.nickname || "Item",
      quantity: li.quantity || 1,
      amount_total: li.amount_total ?? li.amount_subtotal ?? 0,
      currency: li.currency || session.currency || "usd",
    }));

    return resp(200, {
      id: session.id,
      payment_status: session.payment_status,
      amount_total: session.amount_total ?? 0,
      currency: session.currency || "usd",
      customer_email: session.customer_details?.email || session.customer_email || null,
      customer_phone: session.customer_details?.phone || null,
      metadata: session.metadata || {},
      items,
    });
  } catch (err) {
    return resp(500, { error: "Server error", detail: String(err) });
  }
}

function resp(status, body) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
