// netlify/functions/get-session.js
exports.handler = async (event) => {
  try {
    const id = event.queryStringParameters?.id || "";
    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing session id" }) };
    }

    const url = new URL(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`);
    url.searchParams.append("expand[]", "line_items");
    url.searchParams.append("expand[]", "payment_intent");
    url.searchParams.append("expand[]", "customer_details");

    const resp = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
    });

    const s = await resp.json();
    if (!resp.ok) {
      return { statusCode: resp.status, body: JSON.stringify(s) };
    }

    // Build items array
    const items = (s.line_items?.data || []).map((li) => {
      const qty = li.quantity ?? 1;
      const amount = li.amount_total != null
        ? li.amount_total
        : (li.price?.unit_amount || 0) * qty;

      return {
        description: li.description || li.price?.product || "Item",
        quantity: qty,
        amount_total: amount,
        unit_amount: li.price?.unit_amount,
        currency: li.currency || s.currency,
      };
    });

    // Merge metadata from BOTH places
    const mergedMd = { ...(s.metadata || {}), ...(s.payment_intent?.metadata || {}) };

    const out = {
      id: s.id,
      amount_total: s.amount_total,
      currency: s.currency,
      items,
      customer_email: s.customer_details?.email || s.customer_email || null,
      customer_phone: s.customer_details?.phone || null,
      metadata: mergedMd,
      payment_status: s.payment_status || s.status || "paid",
    };

    return { statusCode: 200, body: JSON.stringify(out) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server error", details: String(err) }) };
  }
};
