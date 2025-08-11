// netlify/functions/create-checkout-session.js
// Node 18+ (native fetch). Form-encodes for Stripe.

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const SECRET = process.env.STRIPE_SECRET_KEY;
  if (!SECRET) {
    return { statusCode: 500, body: JSON.stringify({ error: "Missing STRIPE_SECRET_KEY env var" }) };
  }

  // -------- Parse body --------
  let body = {};
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) }; }

  // -------- Price tables (cents) --------
  const packagePrices = {
    A: 3200, A1: 4100,
    B: 2700, B1: 3200,
    C: 2200, C1: 2700,
    D: 1800, D1: 2300,
    E: 1200, E1: 1700,
  };
  const addonNames = {
    F: "8x10 Print", G: "2x 5x7 Prints", H: "4x 3½x5 Prints",
    I: "24 Wallets", J: "8 Wallets", K: "16 Mini Wallets",
    L: "Retouching", M: "8x10 Class Composite", N: "Digital File",
  };
  const addonPrices = { F:600, G:600, H:600, I:1800, J:600, K:600, L:700, M:800, N:1500 };

  // -------- Build line_items (two paths) --------
  let lineItems = [];

  // Path 1: server-calculated from package + addons (preferred)
  const selectedPackage = (body.package || "").trim();
  const selectedAddons = Array.isArray(body.addons) ? body.addons : [];

  if (selectedPackage) {
    const amt = packagePrices[selectedPackage];
    if (!amt) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing or invalid package" }) };
    }
    lineItems.push({ name: `Package ${selectedPackage}`, amount: amt, quantity: 1 });

    selectedAddons.forEach((code) => {
      const price = addonPrices[code];
      if (price) lineItems.push({
        name: `Add-on ${code} — ${addonNames[code]}`,
        amount: price,
        quantity: 1
      });
    });
  }

  // Path 2: if client sent prebuilt line_items, use them instead
  if (Array.isArray(body.line_items) && body.line_items.length > 0) {
    const fromClient = [];
    for (const it of body.line_items) {
      const name = it?.price_data?.product_data?.name || it?.name;
      const amount = it?.price_data?.unit_amount ?? it?.amount;
      const quantity = Number(it?.quantity || 1);
      if (typeof name === "string" && Number.isInteger(amount) && amount > 0 && quantity > 0) {
        fromClient.push({ name, amount, quantity });
      }
    }
    if (fromClient.length > 0) lineItems = fromClient; // override with client items
  }

  if (lineItems.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing or invalid line_items" }) };
  }

  // -------- Metadata (merge derived + client) --------
  const derivedMeta = {
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
  const clientMeta = (body.metadata && typeof body.metadata === "object") ? body.metadata : {};
  const mergedMetadata = { ...derivedMeta, ...clientMeta }; // client keys win

  // -------- Build form-encoded params --------
  try {
    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("payment_method_types[]", "card");

    params.append(
      "success_url",
      "https://schools.scottymkerphotos.com/success.html?session_id={CHECKOUT_SESSION_ID}"
    );
    params.append(
      "cancel_url",
      "https://schools.scottymkerphotos.com/cancel.html"
    );

    const email = (body.parent_email || body.email || "").trim();
    if (email) params.append("customer_email", email);
    params.append("phone_number_collection[enabled]", "true");

    lineItems.forEach((li, i) => {
      params.append(`line_items[${i}][price_data][currency]`, "usd");
      params.append(`line_items[${i}][price_data][product_data][name]`, li.name);
      params.append(`line_items[${i}][price_data][unit_amount]`, String(li.amount));
      params.append(`line_items[${i}][quantity]`, String(li.quantity));
    });

    Object.entries(mergedMetadata).forEach(([k, v]) => {
      if (v != null && String(v).trim() !== "") {
        params.append(`metadata[${k}]`, String(v));
        params.append(`payment_intent_data[metadata][${k}]`, String(v)); // mirror on payment
      }
    });

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SECRET}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const text = await stripeRes.text();
    let json; try { json = JSON.parse(text); } catch { /* ignore */ }

    if (!stripeRes.ok) {
      return { statusCode: stripeRes.status, body: typeof json === "object" ? JSON.stringify(json) : text };
    }

    return { statusCode: 200, body: JSON.stringify({ url: json.url }) };
  } catch (err) {
    console.error("Stripe error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Stripe error" }) };
  }
};
