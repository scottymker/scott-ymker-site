// netlify/functions/create-checkout-session.js
// Uses native fetch (Node 18+), no external deps.

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const SECRET = process.env.STRIPE_SECRET_KEY;
  if (!SECRET) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing STRIPE_SECRET_KEY env var" }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  // ----- Price tables (amounts in cents) -----
  const packagePrices = {
    A: 3200, A1: 4100,
    B: 2700, B1: 3200,
    C: 2200, C1: 2700,
    D: 1800, D1: 2300,
    E: 1200, E1: 1700,
  };

  const addonPrices = {
    F: 600,  // 8x10 Print
    G: 600,  // 2x 5x7 Prints
    H: 600,  // 4x 3½x5 Prints
    I: 1800, // 24 Wallets
    J: 600,  // 8 Wallets
    K: 600,  // 16 Mini Wallets
    L: 700,  // Retouching
    M: 800,  // 8x10 Class Composite
    N: 1500, // Digital File
  };

  const selectedPackage = (body.package || "").trim();
  const selectedAddons = Array.isArray(body.addons) ? body.addons : [];

  // ---------- Build line items ----------
  const lineItems = [];

  // Validate and add package
  const pkgAmount = packagePrices[selectedPackage];
  if (!pkgAmount) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing or invalid package" }) };
  }

  lineItems.push({
    name: `Package ${selectedPackage}`,
    amount: pkgAmount,
    quantity: 1,
  });

  // Validate and add each add-on
  selectedAddons.forEach((code) => {
    const price = addonPrices[code];
    if (price) {
      const names = {
        F: "8x10 Print",
        G: "2x 5x7 Prints",
        H: "4x 3½x5 Prints",
        I: "24 Wallets",
        J: "8 Wallets",
        K: "16 Mini Wallets",
        L: "Retouching",
        M: "8x10 Class Composite",
        N: "Digital File",
      };
      lineItems.push({
        name: `Add-on ${code} — ${names[code]}`,
        amount: price,
        quantity: 1,
      });
    }
  });

  if (lineItems.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing or invalid line_items" }) };
  }

  // ---------- Metadata ----------
  const mergedMetadata = {
    addons: selectedAddons.join(", "),
    background: body.background || "",
    student_first: body.student_first || "",
    student_last: body.student_last || "",
    teacher: body.teacher || "",
    grade: body.grade || "",
    school: body.school || "",
    parent_name: body.parent_name || "",
    parent_phone: body.parent_phone || "",
    parent_email: body.parent_email || "",
  };

  // ---------- Create Stripe Checkout Session ----------
  try {
    const params = new URLSearchParams();

    // session core
    params.append("mode", "payment");
    params.append("payment_method_types[]", "card");

    // success/cancel (include session id on success)
    params.append(
      "success_url",
      "https://schools.scottymkerphotos.com/success.html?session_id={CHECKOUT_SESSION_ID}"
    );
    params.append(
      "cancel_url",
      "https://schools.scottymkerphotos.com/cancel.html"
    );

    // prefill email and show phone field
    const email = (body.parent_email || "").trim();
    if (email) params.append("customer_email", email);
    params.append("phone_number_collection[enabled]", "true");

    // line items
    lineItems.forEach((li, idx) => {
      params.append(`line_items[${idx}][price_data][currency]`, "usd");
      params.append(`line_items[${idx}][price_data][product_data][name]`, li.name);
      params.append(`line_items[${idx}][price_data][unit_amount]`, String(li.amount));
      params.append(`line_items[${idx}][quantity]`, String(li.quantity));
    });

    // session metadata
    Object.entries(mergedMetadata).forEach(([k, v]) => {
      if (v != null && String(v).trim() !== "") {
        params.append(`metadata[${k}]`, String(v));
      }
    });

    // ALSO mirror metadata to the Payment so it appears in Stripe's "Payment" view
    Object.entries(mergedMetadata).forEach(([k, v]) => {
      if (v != null && String(v).trim() !== "") {
        params.append(`payment_intent_data[metadata][${k}]`, String(v));
      }
    });

    // create session
    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SECRET}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const text = await stripeRes.text();
    let session;
    try { session = JSON.parse(text); } catch { /* leave as text */ }

    if (!stripeRes.ok) {
      // bubble Stripe's error
      return {
        statusCode: stripeRes.status,
        body: typeof session === "object" ? JSON.stringify(session) : text,
      };
    }

    // Return URL for redirect
    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error("Stripe error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Stripe error" }),
    };
  }
};
