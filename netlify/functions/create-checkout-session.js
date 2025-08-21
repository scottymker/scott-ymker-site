// netlify/functions/create-checkout-session.js
const crypto = require("crypto");

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { line_items = [], metadata = {}, email } = JSON.parse(event.body || "{}");
    if (!Array.isArray(line_items) || line_items.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing or invalid line_items" }) };
    }

    // Base URL for success/cancel
    const origin =
      event.headers?.origin ||
      (event.headers?.host ? `https://${event.headers.host}` : "https://schools.scottymkerphotos.com");

    // ----- Generate friendly Order # (searchable in Stripe) -----
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm   = String(now.getMonth() + 1).padStart(2, "0");
    const dd   = String(now.getDate()).padStart(2, "0");
    const rand = (crypto.randomBytes ? crypto.randomBytes(3).toString("hex") : Math.random().toString(36).slice(-6))
      .slice(-6) // ensure 6 chars
      .toUpperCase();
    const order_number = `SYP-${yyyy}${mm}${dd}-${rand}`;

    // Build form body
    const form = new URLSearchParams();
    form.set("mode", "payment");
    form.set("success_url", `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`);
    form.set("cancel_url", `${origin}/multi-order.html`);

    // Prefill email + show phone field
    if (email) form.set("customer_email", String(email));
    form.set("phone_number_collection[enabled]", "true");

    // Make Order # searchable:
    // - client_reference_id
    // - metadata.order_number on Session
    // - payment_intent_data.metadata.order_number on PI
    form.set("client_reference_id", order_number);
    form.set("metadata[order_number]", order_number);
    form.set("payment_intent_data[metadata][order_number]", order_number);

    // Encode line_items
    line_items.forEach((li, i) => {
      const p = li?.price_data || {};
      form.set(`line_items[${i}][quantity]`, String(li.quantity ?? 1));
      form.set(`line_items[${i}][price_data][currency]`, String(p.currency || "usd"));
      if (p.unit_amount == null) throw new Error("Each line item needs unit_amount");
      form.set(`line_items[${i}][price_data][unit_amount]`, String(p.unit_amount));
      form.set(`line_items[${i}][price_data][product_data][name]`, String(p.product_data?.name || "Item"));
    });

    // Mirror ALL provided metadata to both the Session and the PaymentIntent
    // (Order # already set above; this adds the rest.)
    for (const [k, v] of Object.entries(metadata || {})) {
      if (v != null && String(v).trim() !== "") {
        form.set(`metadata[${k}]`, String(v));
        form.set(`payment_intent_data[metadata][${k}]`, String(v));
      }
    }

    // (Optional but nice): a human description on the PI
    form.set("payment_intent_data[description]", `School Photos Order ${order_number}`);

    // Create Checkout Session via Stripe API (using form-encoded POST)
    const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });

    const data = await resp.json();
    if (!resp.ok) {
      return { statusCode: resp.status, body: JSON.stringify({ error: "Stripe error", details: data }) };
    }

    return { statusCode: 200, body: JSON.stringify({ url: data.url }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server error", details: String(err) }) };
  }
};
