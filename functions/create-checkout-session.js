
export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await request.json();

  const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.Stripe_Key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      mode: "payment",
      success_url: "https://schools.scottymkerphotos.com/success.html",
      cancel_url: "https://schools.scottymkerphotos.com/cancel.html",
      line_items: JSON.stringify(body.line_items),
      payment_method_types: "card",
      metadata: JSON.stringify(body.metadata),
    }),
  });

  const session = await stripeRes.json();
  return new Response(JSON.stringify({ id: session.id }), {
    headers: { "Content-Type": "application/json" },
  });
}
