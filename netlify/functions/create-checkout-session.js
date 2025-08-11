// netlify/functions/create-checkout-session.js

exports.handler = async (event) => {
  // Only allow POSTs
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Allow": "POST", "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  // Basic CORS (same-origin is fine, but this keeps dev tools happy)
  const jsonHeaders = {
    "Content-Type": "application/json",
  };

  try {
    const body = JSON.parse(event.body || "{}");

    // ---- Pricing (cents) ----
    const packagePrices = {
      A: 3200, A1: 4100,
      B: 2700, B1: 3200,
      C: 2200, C1: 2700,
      D: 1800, D1: 2300,
      E: 1200, E1: 1700,
    };

    const addonPrices = {
      F: 500,  G: 800,  H: 800,
      I: 800,  J: 800,  K: 800,
      L: 1000, M: 1500, N: 2000,
    };

    const selectedPackage = body.package;
    const selectedAddons  = Array.isArray(body.addons) ? body.addons : [];
    const background      = body.background || "";

    // Build Stripe line_items
    const line_items = [];

    if (selectedPackage && packagePrices[selectedPackage]) {
      line_items.push({
        price_data: {
          currency: "usd",
          product_data: { name: `Package ${selectedPackage}` },
          unit_amount: packagePrices[selectedPackage],
        },
        quantity: 1,
      });
    }

    selectedAddons.forEach((addon) => {
      if (addonPrices[addon]) {
        line_items.push({
          price_data: {
            currency: "usd",
            product_data: { name: `Add-on ${addon}` },
            unit_amount: addonPrices[addon],
          },
          quantity: 1,
        });
      }
    });

    if (line_items.length === 0) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ error: "No valid items in the order" }),
      };
    }

    // Metadata for your order
    const metadata = {
      student_first: body.student_first || "",
      student_last:  body.student_last  || "",
      teacher:       body.teacher       || "",
      grade:         body.grade         || "",
      school:        body.school        || "",
      parent_name:   body.parent_name   || "",
      parent_phone:  body.parent_phone  || "",
      parent_email:  body.parent_email  || "",
      background,
      addons:        selectedAddons.join(", "),
    };

    const secret = process.env.STRIPE_SECRET_KEY; // <-- must be set in Netlify
    if (!secret) {
      return {
        statusCode: 500,
        headers: jsonHeaders,
        body: JSON.stringify({ error: "Missing STRIPE_SECRET_KEY on server" }),
      };
    }

    // Create Stripe Checkout Session
    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "payment",
        // Update these if you’re using a custom domain:
        success_url: "https://schools.scottymkerphotos.com/success.html",
        cancel_url:  "https://schools.scottymkerphotos.com/cancel.html",
        payment_method_types: ["card"],
        line_items,
        metadata,
      }),
    });

    if (!stripeRes.ok) {
      const txt = await stripeRes.text();
      return {
        statusCode: 502,
        headers: jsonHeaders,
        body: JSON.stringify({ error: "Stripe error", details: txt }),
      };
    }

    const session = await stripeRes.json();

    // Small tweak: return the Checkout URL so the client can redirect
    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Failed to create checkout session", details: String(err) }),
    };
  }
};
