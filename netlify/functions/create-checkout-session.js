// netlify/functions/create-checkout-session.js
// Requires env var: STRIPE_SECRET_KEY
// Uses Node's built-in fetch (no node-fetch import).

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const host =
      event.headers["x-forwarded-host"] ||
      event.headers.host ||
      "localhost:8888";
    const origin = `https://${host}`;

    // ---------- Accept either client-built line_items or raw selections ----------
    let lineItems = Array.isArray(body.line_items) ? body.line_items : null;

    if (!lineItems) {
      // (Optional) Build on the server from simple selections
      const pkgPrices = {
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

      lineItems = [];
      if (body.package && pkgPrices[body.package]) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: { name: `Package ${body.package}` },
            unit_amount: pkgPrices[body.package],
          },
          quantity: 1,
        });
      }

      const chosenAddons = Array.isArray(body.addons)
        ? body.addons
        : body.addons
        ? [body.addons]
        : [];
      chosenAddons.forEach((code) => {
        if (addonPrices[code]) {
          lineItems.push({
            price_data: {
              currency: "usd",
              product_data: { name: `Add-on ${code}` },
              unit_amount: addonPrices[code],
            },
            quantity: 1,
          });
        }
      });
    }

    // ---------- Metadata (prefer what the client sent; fall back to raw fields) ----------
    const metadata = body.metadata || {
      student_first: body.studentFirstName || body.student_first || "",
      student_last:  body.studentLastName  || body.student_last  || "",
      teacher:       body.teacher || "",
      grade:         body.grade   || "",
      school:        body.school  || "",
      parent_name:   body.parentName  || body.parent_name  || "",
      parent_phone:  body.phone       || body.parent_phone || "",
      parent_email:  body.email       || body.parent_email || "",
      background:    body.background  || "",
      addons: Array.isArray(body.addons) ? body.addons.join(", ") : body.addons || ""
    };

    // ---------- Build application/x-www-form-urlencoded payload for Stripe ----------
    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", `${origin}/success.html`);
    params.append("cancel_url", `${origin}/cancel.html`);
    params.append("payment_method_types[0]", "card");

    lineItems.forEach((item, i) => {
      const qty = item.quantity || 1;
      const name =
        (item.price_data &&
          item.price_data.product_data &&
          item.price_data.product_data.name) ||
        "Item";
      const currency =
        (item.price_data && item.price_data.currency) || "usd";
      const amount =
        (item.price_data && item.price_data.unit_amount) || 0;

      params.append(`line_items[${i}][quantity]`, String(qty));
      params.append(`line_items[${i}][price_data][currency]`, currency);
      params.append(
        `line_items[${i}][price_data][product_data][name]`,
        String(name)
      );
      params.append(
        `line_items[${i}][price_data][unit_amount]`,
        String(amount)
      );
    });

    Object.entries(metadata).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        params.append(`metadata[${k}]`, String(v));
      }
    });

    // ---------- Create the Checkout Session ----------
    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      return {
        statusCode: stripeRes.status,
        body: JSON.stringify({ error: "Stripe error", details: session }),
      };
    }

    // Return the URL for the frontend to redirect
    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Server error",
        message: err.message || String(err),
      }),
    };
  }
};
