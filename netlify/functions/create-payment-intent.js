// netlify/functions/create-payment-intent.js
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

    // Calculate total from line items
    let totalAmount = 0;
    const description_parts = [];
    line_items.forEach(li => {
      const p = li?.price_data || {};
      const qty = li.quantity ?? 1;
      const unitAmount = p.unit_amount;
      if (unitAmount == null) throw new Error("Each line item needs unit_amount");
      totalAmount += unitAmount * qty;
      description_parts.push(p.product_data?.name || "Item");
    });

    if (totalAmount < 50) {
      return { statusCode: 400, body: JSON.stringify({ error: "Order total must be at least $0.50" }) };
    }

    // Generate order number
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const rand = (crypto.randomBytes ? crypto.randomBytes(3).toString("hex") : Math.random().toString(36).slice(-6))
      .slice(-6)
      .toUpperCase();
    const order_number = `SYP-${yyyy}${mm}${dd}-${rand}`;

    // Build metadata for PaymentIntent
    const piMetadata = { order_number };
    for (const [k, v] of Object.entries(metadata || {})) {
      if (v != null && String(v).trim() !== "") {
        piMetadata[k] = String(v);
      }
    }

    // Create PaymentIntent via Stripe API
    const form = new URLSearchParams();
    form.set("amount", String(totalAmount));
    form.set("currency", "usd");
    form.set("description", `School Photos Order ${order_number}`);
    form.set("automatic_payment_methods[enabled]", "true");
    if (email) form.set("receipt_email", String(email));

    for (const [k, v] of Object.entries(piMetadata)) {
      form.set(`metadata[${k}]`, v);
    }

    const resp = await fetch("https://api.stripe.com/v1/payment_intents", {
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

    return {
      statusCode: 200,
      body: JSON.stringify({
        clientSecret: data.client_secret,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        orderNumber: order_number,
        amount: totalAmount,
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server error", details: String(err) }) };
  }
};
