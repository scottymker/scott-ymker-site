// No imports needed — Node 18+ has global fetch

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body = JSON.parse(event.body || "{}");

    // ----- Prices (cents) -----
    const packagePrices = {
      A: 3200, A1: 4100,
      B: 2700, B1: 3200,
      C: 2200, C1: 2700,
      D: 1800, D1: 2300,
      E: 1200, E1: 1700
    };

    const addonPrices = {
      F: 600,  // 8x10 Print ($6)
      G: 600,  // 2x 5x7 ($6)
      H: 600,  // 4x 3.5x5 ($6)
      I: 1800, // 24 Wallets ($18)
      J: 600,  // 8 Wallets ($6)
      K: 600,  // 16 Mini Wallets ($6)
      L: 700,  // Retouching ($7)
      M: 800,  // 8x10 Class Composite ($8)
      N: 1500  // Digital File ($15)
    };

    const selectedPackage = body.package;
    const selectedAddons = Array.isArray(body.addons) ? body.addons : [];
    if (!selectedPackage || !packagePrices[selectedPackage]) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing or invalid package" })
      };
    }

    // ----- Build line_items -----
    const items = [];

    // Package
    items.push({
      name: `Package ${selectedPackage}`,
      unit_amount: packagePrices[selectedPackage],
      quantity: 1
    });

    // Add-ons
    selectedAddons.forEach((code) => {
      if (addonPrices[code]) {
        items.push({
          name: `Add-on ${code}`,
          unit_amount: addonPrices[code],
          quantity: 1
        });
      }
    });

    // ----- Metadata -----
    const metadata = {
      student_first: body.student_first,
      student_last:  body.student_last,
      teacher:       body.teacher,
      grade:         body.grade,
      school:        body.school,
      parent_name:   body.parent_name,
      parent_phone:  body.parent_phone,
      parent_email:  body.parent_email,
      background:    body.background,
      addons:        selectedAddons.join(", ")
    };

    // ----- Form-encode for Stripe -----
    const p = new URLSearchParams();
    p.append("mode", "payment");
    p.append(
      "success_url",
      "https://schools.scottymkerphotos.com/success.html?session_id={CHECKOUT_SESSION_ID}"
    );
    p.append("cancel_url", "https://schools.scottymkerphotos.com/cancel.html");
    p.append("payment_method_types[]", "card");

    // Show phone field (nice to have)
    p.append("phone_number_collection[enabled]", "true");

    // Pre-fill email if we have it
    if (body.parent_email) p.append("customer_email", body.parent_email);

    // line_items[…]
    items.forEach((it, i) => {
      p.append(`line_items[${i}][price_data][currency]`, "usd");
      p.append(`line_items[${i}][price_data][product_data][name]`, it.name);
      p.append(`line_items[${i}][price_data][unit_amount]`, String(it.unit_amount));
      p.append(`line_items[${i}][quantity]`, String(it.quantity || 1));
    });

    // metadata[…]
    Object.entries(metadata).forEach(([k, v]) => {
      if (v != null && String(v).trim() !== "") {
        p.append(`metadata[${k}]`, String(v));
      }
    });

    // ----- Call Stripe -----
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: p.toString()
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Stripe error:", data);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Stripe error", details: data })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ id: data.id, url: data.url })
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "Server error" }) };
  }
};
