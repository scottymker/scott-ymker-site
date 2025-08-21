// netlify/functions/stripe-webhook.js
const crypto = require("crypto");

const SHEETS_WEBAPP_URL = process.env.SHEETS_WEBAPP_URL; // <-- paste your Apps Script Web App URL here (or set in Netlify env)
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET; // from Stripe Dashboard > Webhooks

// ----- Stripe signature verification (no SDK needed) -----
function parseStripeSig(header = "") {
  // Example: t=1692112026,v1=abc123,v1=def456
  const out = {};
  header.split(",").forEach(kv => {
    const [k, v] = kv.split("=");
    if (!k || !v) return;
    (out[k.trim()] ||= []).push(v.trim());
  });
  return out;
}
function secureCompare(a, b) {
  const bufA = Buffer.from(a || "", "utf8");
  const bufB = Buffer.from(b || "", "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
function verifyStripeSignature(rawBody, sigHeader, secret, toleranceSec = 300) {
  const parsed = parseStripeSig(sigHeader);
  const t = parsed.t?.[0];
  const v1s = parsed.v1 || [];
  if (!t || !v1s.length) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const ts = Number(t);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > toleranceSec) return false;
  return v1s.some(v1 => secureCompare(v1, expected));
}

// ----- helpers -----
function splitFirstLast(full) {
  const parts = String(full || "").trim().split(/\s+/);
  if (parts.length <= 1) return [parts[0] || "", ""];
  const last = parts.pop();
  return [parts.join(" "), last];
}
function getStudentCount(md) {
  const n = parseInt(md?.students_count || "0", 10);
  if (n > 0) return n;
  // fallback: infer by scanning keys like s1_name, s2_name...
  const idxs = Object.keys(md || {})
    .map(k => (k.match(/^s(\d+)_name$/) || [])[1])
    .filter(Boolean)
    .map(Number);
  return idxs.length ? Math.max(...idxs) : 0;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }
    if (!STRIPE_WEBHOOK_SECRET) {
      return { statusCode: 500, body: "Missing STRIPE_WEBHOOK_SECRET" };
    }
    if (!SHEETS_WEBAPP_URL) {
      return { statusCode: 500, body: "Missing SHEETS_WEBAPP_URL" };
    }

    const sig = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];
    const raw = event.body || "";

    if (!verifyStripeSignature(raw, sig, STRIPE_WEBHOOK_SECRET)) {
      return { statusCode: 400, body: "Invalid signature" };
    }

    const stripeEvent = JSON.parse(raw);
    // Only act on successful payments
    if (stripeEvent.type !== "checkout.session.completed") {
      return { statusCode: 200, body: "Ignored" };
    }

    const session = stripeEvent.data?.object || {};
    const md = session.metadata || {};
    const rows = [];

    const count = getStudentCount(md);
    for (let i = 1; i <= count; i++) {
      const full = md[`s${i}_name`] || "";
      const [first, last] = splitFirstLast(full);
      const grade   = md[`s${i}_grade`]   || "";
      const teacher = md[`s${i}_teacher`] || "";
      const pkg     = md[`s${i}_pkg`]     || "";
      rows.push({
        Package: pkg,
        LastName: last,
        FirstName: first,
        Grade: grade,
        Teacher: teacher
      });
    }

    if (rows.length === 0) {
      // Nothing to write; still OK
      return { statusCode: 200, body: "No student rows" };
    }

    // Send to your Sheet (Apps Script Web App)
    const resp = await fetch(SHEETS_WEBAPP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows })
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return { statusCode: 502, body: `Sheets error: ${txt}` };
    }

    return { statusCode: 200, body: JSON.stringify({ appended: rows.length }) };
  } catch (err) {
    return { statusCode: 500, body: `Webhook error: ${String(err)}` };
  }
};
