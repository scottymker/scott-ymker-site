export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await request.json();

  const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.Stripe_Key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode: "payment",
      success_url: "https://schools.scottymkerphotos.com/success.html",
      cancel_url: "https://schools.scottymkerphotos.com/cancel.html",
      payment_method_types: ["card"],
      line_items: body.line_items,
      metadata: body.metadata,
    }),
  });

  const session = await stripeRes.json();

  if (!stripeRes.ok) {
    return new Response(JSON.stringify({ error: session.error }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { "Content-Type": "application/json" },
  });
}
