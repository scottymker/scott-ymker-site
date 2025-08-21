// netlify/functions/stripe-webhook.js
const crypto = require("crypto");

const SHEETS_WEBAPP_URL = process.env.SHEETS_WEBAPP_URL; // Google Apps Script Web App URL
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET; // Stripe signing secret

// --- Stripe sig verification helpers ---
function parseStripeSig(header = "") {
  const out = {};
  header.split(",").forEach(kv => {
    const [k, v] = kv.split("=");
    if (!k || !v) return;
    (out[k.trim()] ||= []).push(v.trim());
  });
  return out;
}
function secureCompare(a, b) {
  const A = Buffer.from(a || "", "utf8");
  const B = Buffer.from(b || "", "utf8");
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}
function verifyStripeSignature(rawBody, sigHeader, secret, toleranceSec = 300) {
  const parsed = parseStripeSig(sigHeader);
  const t = parsed.t?.[0];
  const v1s = parsed.v1 || [];
  if (!t || !v1s.length) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const ts = Number(t);
  if (!Number.isFinite(ts) || Math.abs(Date.now()/1000 - ts) > toleranceSec) return false;
  return v1s.some(v1 => secureCompare(v1, expected));
}

// --- data helpers ---
function splitFirstLast(full) {
  const parts = String(full || "").trim().split(/\s+/);
  if (parts.length <= 1) return [parts[0] || "", ""];
  const last = parts.pop();
  return [parts.join(" "), last];
}
function getStudentCount(md) {
  const n = parseInt(md?.students_count || "0", 10);
  if (n > 0) return n;
  const idxs = Object.keys(md || {})
    .map(k => (k.match(/^s(\d+)_name$/) || [])[1])
    .filter(Boolean)
    .map(Number);
  return idxs.length ? Math.max(...idxs) : 0;
}
function fallbackOrderNumber(session) {
  const base = (session.payment_intent && session.payment_intent.id) || session.payment_intent || session.id || "";
  const tail = ((base.match(/[a-z0-9]+$/i) || [""])[0]).slice(-6).toUpperCase().padStart(6,"X");
  const d = new Date((session.created || 0) * 1000);
  const yyyy = d.getFullYear(), mm = String(d.getMonth()+1).padStart(2,"0"), dd = String(d.getDate()).padStart(2,"0");
  return `SYP-${yyyy}${mm}${dd}-${tail}`;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }
    if (!STRIPE_WEBHOOK_SECRET) return { statusCode: 500, body: "Missing STRIPE_WEBHOOK_SECRET" };
    if (!SHEETS_WEBAPP_URL)     return { statusCode: 500, body: "Missing SHEETS_WEBAPP_URL" };

    const sig = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];
    const raw = event.body || "";

    if (!verifyStripeSignature(raw, sig, STRIPE_WEBHOOK_SECRET)) {
      return { statusCode: 400, body: "Invalid signature" };
    }

    const stripeEvent = JSON.parse(raw);
    if (stripeEvent.type !== "checkout.session.completed") {
      return { statusCode: 200, body: "Ignored" };
    }

    const session = stripeEvent.data?.object || {};
    const md = session.metadata || {};

    const orderNumber = md.order_number || fallbackOrderNumber(session);
    const parentEmail = session.customer_email || md.parent_email || "";

    const rows = [];
    const count = getStudentCount(md);
    for (let i = 1; i <= count; i++) {
      const fullName = md[`s${i}_name`] || "";
      const [first, last] = splitFirstLast(fullName);
      const grade   = md[`s${i}_grade`]   || "";
      const teacher = md[`s${i}_teacher`] || "";
      const pkg     = md[`s${i}_pkg`]     || "";
      const bg      = md[`s${i}_bg`]      || (md.background || ""); // per-student, with fallback

      rows.push({
        Package: pkg,
        LastName: last,
        FirstName: first,
        Grade: grade,
        Teacher: teacher,
        Background: bg,
        OrderNumber: orderNumber,
        ParentEmail: parentEmail
      });
    }

    if (!rows.length) return { statusCode: 200, body: "No student rows" };

    const resp = await fetch(SHEETS_WEBAPP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows })
    });
    if (!resp.ok) return { statusCode: 502, body: `Sheets error: ${await resp.text()}` };

    return { statusCode: 200, body: JSON.stringify({ appended: rows.length }) };
  } catch (err) {
    return { statusCode: 500, body: `Webhook error: ${String(err)}` };
  }
};
