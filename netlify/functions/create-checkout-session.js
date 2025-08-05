const fetch = require("node-fetch");

exports.handler = async (event, context) => {
  try {
    const body = JSON.parse(event.body);

    // Transform incoming form data into Stripe line_items and metadata
    const packagePrices = {
      A: 3200, A1: 4100,
      B: 2700, B1: 3200,
      C: 2200, C1: 2700,
      D: 1800, D1: 2300,
      E: 1200, E1: 1700
    };

    const addonPrices = {
      F: 600, G: 600, H: 600,
      I: 1800, J: 600, K: 600,
      L: 700, M: 800, N: 1500
    };

    const line_items = [];

    // Required: One main package
    const selectedPackage = body.package;
    if (packagePrices[selectedPackage]) {
      line_items.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: `Package ${selectedPackage}`
          },
          unit_amount: packagePrices[selectedPackage]
        },
        quantity: 1
      });
    }

    // Optional: Add-ons (can be array or string)
    const addons = Array.isArray(body.addons) ? body.addons : (body.addons ? [body.addons] : []);
    for (const addon of addons) {
      if (addonPrices[addon]) {
        line_items.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: `Add-on ${addon}`
            },
            unit_amount: addonPrices[addon]
          },
          quantity: 1
        });
      }
    }

    // Optional metadata to help identify the order
    const metadata = {
      studentFirstName: body.studentFirstName,
      studentLastName: body.studentLastName,
      teacher: body.teacher,
      grade: body.grade,
      school: body.school,
      parentName: body.parentName,
      phone: body.phone,
      email: body.email,
      package: body.package,
      background: body.background,
      addons: addons.join(", ")
    };

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "payment",
        success_url: "https://schools.scottymkerphotos.com/success.html",
        cancel_url: "https://schools.scottymkerphotos.com/cancel.html",
        payment_method_types: ["card"],
        line_items,
        metadata
      }),
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: session.error }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

