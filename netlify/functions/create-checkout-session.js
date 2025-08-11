// netlify/functions/create-checkout-session.js
exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    const packagePrices = {
      A: 3200, A1: 4100,
      B: 2700, B1: 3200,
      C: 2200, C1: 2700,
      D: 1800, D1: 2300,
      E: 1200, E1: 1700
    };
    const addonPrices = { F: 500, G: 600, H: 600, I: 1800, J: 600, K: 600, L: 700, M: 800, N: 1500 };

    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", "https://schools.scottymkerphotos.com/success.html");
    params.append("cancel_url",  "https://schools.scottymkerphotos.com/cancel.html");
    params.append("customer_email", body.parent_email || "");
    params.append("phone_number_collection[enabled]", "true");

    // Line items (server-calculated)
    if (!packagePrices[body.package]) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing or invalid package" }) };
    }
    // Package line
    params.append("line_items[0][price_data][currency]", "usd");
    params.append("line_items[0][price_data][product_data][name]", `Package ${body.package}`);
    params.append("line_items[0][price_data][unit_amount]", String(packagePrices[body.package]));
    params.append("line_items[0][quantity]", "1");

    // Addons
    let i = 1;
    (body.addons || []).forEach((code) => {
      if (!addonPrices[code]) return;
      params.append(`line_items[${i}][price_data][currency]`, "usd");
      params.append(`line_items[${i}][price_data][product_data][name]`, `Add-on ${code}`);
      params.append(`line_items[${i}][price_data][unit_amount]`, String(addonPrices[code]));
      params.append(`line_items[${i}][quantity]`, "1");
      i++;
    });

    // Metadata to see on the **Session** (visible in Developers → Events)
    const meta = {
      student_first: body.student_first || "",
      student_last:  body.student_last  || "",
      teacher:       body.teacher       || "",
      grade:         body.grade         || "",
      school:        body.school        || "",
      parent_name:   body.parent_name   || "",
      parent_phone:  body.parent_phone  || "",
      parent_email:  body.parent_email  || "",
      background:    body.background    || "",
      addons:        (body.addons || []).join(", ")
    };
    for (const [k, v] of Object.entries(meta)) {
      if (v !== "") params.append(`metadata[${k}]`, String(v));
    }

    // **Critical part:** also attach to the **PaymentIntent** so it shows on the Payments page
    for (const [k, v] of Object.entries(meta)) {
      if (v !== "") params.append(`payment_intent_data[metadata][${k}]`, String(v));
    }
    // Optional: receipt email + description on the PaymentIntent
    if (body.parent_email) params.append("payment_intent_data[receipt_email]", body.parent_email);
    params.append(
      "payment_intent_data[description]",
      `School order for ${meta.student_first} ${meta.student_last}`
    );

    const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    const json = await resp.json();
    if (!resp.ok) {
      return { statusCode: resp.status, body: JSON.stringify({ error: json?.error?.message || "Stripe error", details: json }) };
    }

    return { statusCode: 200, body: JSON.stringify({ url: json.url }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server error", details: String(err) }) };
  }
};
