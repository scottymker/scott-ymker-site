// netlify/functions/create-checkout-session.js
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { line_items = [], metadata = {}, email } = JSON.parse(event.body || "{}");
    if (!Array.isArray(line_items) || line_items.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing or invalid line_items" }) };
    }

    const origin =
      event.headers?.origin ||
      (event.headers?.host ? `https://${event.headers.host}` : "https://schools.scottymkerphotos.com");

    // Build form body
    const form = new URLSearchParams();
    form.set("mode", "payment");
    form.set("success_url", `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`);
    form.set("cancel_url", `${origin}/order.html`);

    // Prefill email + show phone field
    if (email) form.set("customer_email", String(email));
    form.set("phone_number_collection[enabled]", "true");

    // Encode line_items
    line_items.forEach((li, i) => {
      const p = li?.price_data || {};
      form.set(`line_items[${i}][quantity]`, String(li.quantity ?? 1));
      form.set(`line_items[${i}][price_data][currency]`, String(p.currency || "usd"));
      if (p.unit_amount == null) throw new Error("Each line item needs unit_amount");
      form.set(`line_items[${i}][price_data][unit_amount]`, String(p.unit_amount));
      form.set(`line_items[${i}][price_data][product_data][name]`, String(p.product_data?.name || "Item"));
    });

    // Mirror metadata to BOTH the Checkout Session and the PaymentIntent
    for (const [k, v] of Object.entries(metadata || {})) {
      if (v != null && String(v).trim() !== "") {
        form.set(`metadata[${k}]`, String(v));
        form.set(`payment_intent_data[metadata][${k}]`, String(v));
      }
    }

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
