// netlify/functions/get-session.js
exports.handler = async (event) => {
  try {
    const id = event.queryStringParameters?.id || "";
    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing id" }) };
    }

    const headers = { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` };

    // PaymentIntent ID (from Payment Element flow)
    if (id.startsWith("pi_")) {
      const url = new URL(`https://api.stripe.com/v1/payment_intents/${encodeURIComponent(id)}`);
      const resp = await fetch(url, { method: "GET", headers });
      const pi = await resp.json();
      if (!resp.ok) {
        return { statusCode: resp.status, body: JSON.stringify(pi) };
      }

      const md = pi.metadata || {};

      // Build items from metadata (no line_items on PaymentIntent)
      const items = [];
      const n = parseInt(md.students_count || "0", 10) || 0;
      for (let i = 1; i <= n; i++) {
        const pkg = md[`s${i}_pkg`];
        const name = md[`s${i}_name`] || `Student ${i}`;
        if (pkg) {
          items.push({
            description: `${name} — Package ${pkg}`,
            quantity: 1,
            amount_total: null,
            currency: pi.currency,
          });
        }
        const addons = (md[`s${i}_addons`] || "").split(",").map(s => s.trim()).filter(Boolean);
        addons.forEach(code => {
          items.push({
            description: `${name} — Add-on ${code}`,
            quantity: 1,
            amount_total: null,
            currency: pi.currency,
          });
        });
      }

      const out = {
        id: pi.id,
        amount_total: pi.amount,
        currency: pi.currency,
        items,
        customer_email: pi.receipt_email || null,
        customer_phone: md.parent_phone || null,
        metadata: md,
        payment_status: pi.status === "succeeded" ? "paid" : pi.status,
      };

      return { statusCode: 200, body: JSON.stringify(out) };
    }

    // Checkout Session ID (legacy flow)
    const url = new URL(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`);
    url.searchParams.append("expand[]", "line_items");
    url.searchParams.append("expand[]", "payment_intent");
    url.searchParams.append("expand[]", "customer_details");

    const resp = await fetch(url, { method: "GET", headers });
    const s = await resp.json();
    if (!resp.ok) {
      return { statusCode: resp.status, body: JSON.stringify(s) };
    }

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
