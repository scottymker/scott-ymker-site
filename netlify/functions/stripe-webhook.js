// netlify/functions/stripe-webhook.js (ESM)
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-06-20"
});

export async function handler(event) {
  console.log("stripe-webhook loaded, method:", event.httpMethod);

  // Simple GET health check so you can open /api/stripe-webhook in a browser
  if (event.httpMethod === "GET") {
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true, method: "GET" })
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Stripe sends raw JSON & a signature header. If you set STRIPE_WEBHOOK_SECRET,
  // we verify it. Otherwise we just parse the JSON (useful when testing).
  const sig = event.headers["stripe-signature"];
  let evt;

  try {
    if (sig && process.env.STRIPE_WEBHOOK_SECRET) {
      // Use the raw body (Netlify passes it as a string) for verification
      const raw = event.body ?? "";
      evt = stripe.webhooks.constructEvent(
        Buffer.from(raw, "utf8"),
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      console.log("Verified event:", evt.type);
    } else {
      // Fallback parse (e.g., dashboard “Send test webhook” without secret)
      evt = JSON.parse(event.body || "{}");
      console.log("Unverified event (no secret):", evt.type || "(none)");
    }
  } catch (err) {
    console.error("Webhook parse/verify error:", err);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // No-op handler for now — just prove the function works.
  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ok: true })
  };
}
