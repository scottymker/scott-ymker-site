// netlify/functions/create-checkout-session.js
const fetch = require("node-fetch");

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    // Prices in cents
    const packagePrices = {
      A: 3200, A1: 4100,
      B: 2700, B1: 3200,
      C: 2200, C1: 2700,
      D: 1800, D1: 2300,
      E: 1200, E1: 1700
    };
    const addonPrices = {
      F: 500, G: 800, H: 800,
      I: 800, J: 800, K: 800,
      L: 1000, M: 1500, N: 2000
    };

    // Build line items
    const items = [];
    if (body.package && packagePrices[body.package]) {
      items.push({ name: `Package ${body.package}`, amount: packagePrices[body.package] });
    }
    (body.addons || []).forEach(code => {
      if (addonPrices[code]) items.push({ name: `Add-on ${code}`, amount: addonPrices[code] });
    });
    if (items.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "No valid items in the order." }) };
    }

    // Metadata
    const metadata = {
      student_first: body.student_first || "",
      student_last: body.student_last || "",
      teacher: body.teacher || "",
      grade: body.grade || "",
      school: body.school || "",
      parent_name: body.parent_name || "",
      parent_phone: body.parent_phone || "",
      parent_email: body.parent_email || "",
      background: body.background || "",
      addons: (body.addons || []).join(", ")
    };

    // Build form-encoded payload
    const form = new URLSearchParams();
    form.append("mode", "payment");
    form.append("success_url", "https://schools.scottymkerphotos.com/success.html");
    form.append("cancel_url", "https://schools.scottymkerphotos.com/cancel.html");
    form.append("payment_method_types[0]", "card");

    items.forEach((it, i) => {
      form.append(`line_items[${i}][price_data][currency]`, "usd");
      form.append(`line_items[${i}][price_data][product_data][name]`, it.name);
      form.append(`line_items[${i}][price_data][unit_amount]`, String(it.amount));
      form.append(`line_items[${i}][quantity]`, "1");
    });

    Object.entries(metadata).forEach(([k, v]) =>
      form.append(`metadata[${k}]`, String(v ?? ""))
    );

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: form
    });

    if (!stripeRes.ok) {
      const text = await stripeRes.text();
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Stripe error", details: text })
      };
    }

    const session = await stripeRes.json();
    return { statusCode: 200, body: JSON.stringify({ url: session.url, id: session.id }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server error", message: err.message }) };
  }
};
