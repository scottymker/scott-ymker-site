// netlify/functions/stripe-webhook.js
const crypto = require("crypto");

const SHEETS_WEBAPP_URL = process.env.SHEETS_WEBAPP_URL;         // Google Apps Script Web App URL
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET; // Stripe signing secret for THIS endpoint

// ---------- Stripe signature helpers ----------
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

// ---------- data helpers ----------
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
  const tail = ((base.match(/[a-z0-9]+$/i) || [""])[0]).slice(-6).toUpperCase().padStart(6, "X");
  const d = new Date((session.created || 0) * 1000);
  const yyyy = d.getFullYear(), mm = String(d.getMonth()+1).padStart(2, "0"), dd = String(d.getDate()).padStart(2, "0");
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
    let raw = event.body || "";
    if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf8");

    if (!verifyStripeSignature(raw, sig, STRIPE_WEBHOOK_SECRET)) {
      console.error("Invalid signature");
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

    // Build rows: one per student
    const rows = [];
    const count = getStudentCount(md);

    for (let i = 1; i <= count; i++) {
      const fullName = md[`s${i}_name`] || "";
      const [first, last] = splitFirstLast(fullName);
      const grade   = md[`s${i}_grade`]   || "";
      const teacher = md[`s${i}_teacher`] || "";
      const pkg     = (md[`s${i}_pkg`]    || "").trim();
      const bg      = md[`s${i}_bg`]      || (md.background || "");
      const addonsRaw = md[`s${i}_addons`] || ""; // e.g. "F, H"

      // Normalize addon codes and combine with package: "B1, H"
      const addonCodes = addonsRaw
        .split(/[,; ]+/)
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);

      const packageCombined = [pkg, ...addonCodes].filter(Boolean).join(", ");

      rows.push({
        Package: packageCombined,
        LastName: last,
        FirstName: first,
        Grade: grade,
        Teacher: teacher,
        Background: bg,
        OrderNumber: orderNumber,
        ParentEmail: parentEmail
      });
    }

    if (!rows.length) {
      console.log("No student rows to append");
      return { statusCode: 200, body: "No student rows" };
    }

    // Send to Google Sheets (Apps Script Web App)
    const resp = await fetch(SHEETS_WEBAPP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows })
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("Sheets error:", text);
      return { statusCode: 502, body: `Sheets error: ${text}` };
    }

    console.log(`Appended ${rows.length} row(s) to sheet for order ${orderNumber}`);
    return { statusCode: 200, body: JSON.stringify({ appended: rows.length }) };
  } catch (err) {
    console.error("Webhook error:", err);
    return { statusCode: 500, body: `Webhook error: ${String(err)}` };
  }
};
