// netlify/functions/stripe-webhook.js
// Works in both CJS and ESM Netlify runtimes by guarding exports.

"use strict";

const crypto = require ? require("crypto") : await import("node:crypto").then(m => m.default || m);

// Safe dynamic import for our template (avoid build-time issues)
let templates;
try {
  // CJS require if available
  templates = require ? require("./_emails/templates") : null;
} catch {}
if (!templates) {
  // ESM fallback
  templates = await import("./_emails/templates.js").then(m => m.default || m);
}
const { modernReceipt2, PACKAGE_BREAKDOWN, ADDON_NAMES } = templates;

// ---- env --------------------------------------------------------------------
const STRIPE_SIGNING_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const RESEND_API_KEY        = process.env.RESEND_API_KEY;
const EMAIL_FROM            = process.env.EMAIL_FROM || "Scott Ymker Photography <scott@scottymkerphotos.com>";
const REPLY_TO_EMAIL        = process.env.REPLY_TO_EMAIL || "scott@scottymkerphotos.com";
const EMAIL_BCC             = process.env.EMAIL_BCC || "";
const PUBLIC_BASE_URL       = process.env.PUBLIC_BASE_URL;

// ---- helpers ----------------------------------------------------------------
const money = (c = 0) => Number(c || 0);
const fmtOrderNum = (id = "") => String(id).replace(/^cs_/i, "SYP-").toUpperCase();

const PACKAGE_PRICES = { A:3200, A1:4100, B:2700, B1:3200, C:2200, C1:2700, D:1800, D1:2300, E:1200, E1:1700 };
const ADDON_PRICES   = { F:600, G:600, H:600, I:1800, J:600, K:600, L:700, M:800, N:1500 };

function verifyStripeSig(raw, sig, secret) {
  if (!sig || !secret) return false;
  const parts = Object.fromEntries(sig.split(",").map(p => p.trim().split("=")));
  if (!parts.t || !parts.v1) return false;
  const signed = `${parts.t}.${raw}`;
  const expected = crypto.createHmac("sha256", secret).update(signed).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected));
}

async function sendEmail({ to, subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      reply_to: REPLY_TO_EMAIL,
      bcc: EMAIL_BCC ? [EMAIL_BCC] : undefined,
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Resend error ${res.status}: ${txt}`);
  }
}

async function handler(event, context) {
  try {
    // Stripe will POST; allow GET to return 200 for a quick health check in browser
    if (event.httpMethod === "GET") {
      return { statusCode: 200, body: "OK" };
    }
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const rawBody = event.body || "";
    const sig = event.headers["stripe-signature"];
    if (!verifyStripeSig(rawBody, sig, STRIPE_SIGNING_SECRET)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid signature" }) };
    }

    const wrapper = JSON.parse(rawBody);
    if (wrapper.type !== "checkout.session.completed") {
      return { statusCode: 200, body: JSON.stringify({ ok: true, ignored: wrapper.type }) };
    }

    const session = wrapper.data?.object || {};
    const md = session.metadata || {};

    const parentEmail =
      session.customer_details?.email ||
      session.customer_email ||
      md.parent_email ||
      "";

    const students = [];
    for (let i = 1; i <= 12; i++) {
      const name   = md[`s${i}_name`] || "";
      const pkg    = (md[`s${i}_pkg`] || "").toUpperCase();
      const addons = (md[`s${i}_addons`] || "")
        .split(",")
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);
      if (!name && !pkg && !addons.length) continue;

      let amount = 0;
      if (pkg && PACKAGE_PRICES[pkg] != null) amount += PACKAGE_PRICES[pkg];
      addons.forEach(code => { if (ADDON_PRICES[code] != null) amount += ADDON_PRICES[code]; });

      students.push({ name, pkg, addons, amountCents: amount });
    }

    const orderNumber = fmtOrderNum(session.id);
    const totalCents  = money(session.amount_total);
    const currency    = session.currency || "usd";
    const paidAtISO   = new Date((session.created || Math.floor(Date.now()/1000)) * 1000).toISOString();

    const origin = (PUBLIC_BASE_URL || `https://${event.headers.host || ""}`).replace(/\/+$/,"");
    const receiptUrl = `${origin}/success.html?session_id=${encodeURIComponent(session.id)}`;

    const html = modernReceipt2({
      businessName: "Scott Ymker Photography",
      logoUrl: `${origin}/2020Logo_black.png`,
      orderNumber,
      paidAtISO,
      totalCents,
      currency,
      receiptUrl,
      parentEmail,
      students,
      contact: {
        email: "scott@scottymkerphotos.com",
        phone: "605-550-0828",
        site: "https://scottymkerphotos.com",
      },
    });

    await sendEmail({
      to: parentEmail || EMAIL_BCC || REPLY_TO_EMAIL,
      subject: `Receipt • ${orderNumber} • Scott Ymker Photography`,
      html,
    });

    console.info("webhook.ok {");
    console.info("  orderNumber:", `'${orderNumber}',`);
    console.info("  parentEmail:", `'${parentEmail}',`);
    console.info("}");

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("webhook.error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
}

// ---- export for both CJS and ESM -------------------------------------------
if (typeof exports !== "undefined") exports.handler = handler;
if (typeof module !== "undefined") module.exports = { handler };
export default handler; // harmless if parsed as CJS; ESM will use this
