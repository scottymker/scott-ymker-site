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

    const selectedPackage = body.package;
    const selectedAddons = Array.isArray(body.addons) ? body.addons : [];
    const background = body.background;

    const line_items = [];

    if (selectedPackage && packagePrices[selectedPackage]) {
      line_items.push({
        price_data: {
          currency: "usd",
          product_data: { name: `Package ${selectedPackage}` },
          unit_amount: packagePrices[selectedPackage]
        },
        quantity: 1
      });
    }

    for (const addon of selectedAddons) {
      if (addonPrices[addon]) {
        line_items.push({
          price_data: {
            currency: "usd",
            product_data: { name: `Add-on ${addon}` },
            unit_amount: addonPrices[addon]
          },
          quantity: 1
        });
      }
    }

    const metadata = {
      student_first: body.student_first,
      student_last: body.student_last,
      teacher: body.teacher,
      grade: body.grade,
      school: body.school,
      parent_name: body.parent_name,
      parent_phone: body.parent_phone,
      parent_email: body.parent_email,
      background,
      addons: selectedAddons.join(", ")
    };

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mode: "payment",
        success_url: "https://schools.scottymkerphotos.com/success.html",
        cancel_url: "https://schools.scottymkerphotos.com/cancel.html",
        payment_method_types: ["card"],
        line_items,
        metadata
      })
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: session.error || "Stripe error" })
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url })
    };
  } catch (err) {
    console.error("Stripe Checkout Session Error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to create checkout session" })
    };
  }
};
