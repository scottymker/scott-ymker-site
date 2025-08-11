// netlify/functions/create-checkout-session.js
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { line_items, metadata = {}, email } = JSON.parse(event.body || "{}");

    // Validate line items
    if (!Array.isArray(line_items) || line_items.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing or invalid line_items" }),
      };
    }

    // Stripe requires all metadata values to be strings
    const stringMeta = {};
    for (const [k, v] of Object.entries(metadata)) {
      stringMeta[k] = v == null ? "" : String(v);
    }

    // Build Stripe form-encoded payload
    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", "https://schools.scottymkerphotos.com/success.html");
    params.append("cancel_url", "https://schools.scottymkerphotos.com/cancel.html");
    params.append("payment_method_types[0]", "card");

    // Prefill email (user can still change it on the page)
    if (email) {
      params.append("customer_email", String(email));
    }

    // Ask Stripe Checkout to collect a phone number
    params.append("phone_number_collection[enabled]", "true");

    // Encode line_items for Stripe
    line_items.forEach((item, i) => {
      const qty = item.quantity ?? 1;
      params.append(`line_items[${i}][quantity]`, String(qty));

      const pd = item.price_data || {};
      const cur = pd.currency || "usd";
      const amt = pd.unit_amount; // must be integer cents
      const name =
        (pd.product_data && pd.product_data.name) || "Item";

      params.append(`line_items[${i}][price_data][currency]`, cur);
      params.append(`line_items[${i}][price_data][unit_amount]`, String(amt));
      params.append(`line_items[${i}][price_data][product_data][name]`, name);
    });

    // Attach metadata
    for (const [k, v] of Object.entries(stringMeta)) {
      params.append(`metadata[${k}]`, v);
    }

    // Call Stripe
    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, // <- make sure this is set in Netlify
      },
      body: params,
    });

    const data = await stripeRes.json();

    if (!stripeRes.ok) {
      // Surface Stripe’s exact error to the client
      return {
        statusCode: stripeRes.status,
        body: JSON.stringify({
          error: "Stripe error",
          details: data,
        }),
      };
    }

    // Success — give the client the URL to redirect to
    return {
      statusCode: 200,
      body: JSON.stringify({ url: data.url }),
    };
  } catch (err) {
    console.error("Checkout function error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error", details: String(err) }),
    };
  }
};
