// netlify/functions/stripe-webhook.js (CommonJS)
const crypto = require("crypto");
const { modernReceipt2, PACKAGE_BREAKDOWN, ADDON_NAMES } = require("./_emails/templates");
const fetch = global.fetch || require("node-fetch");

// ---- env ----
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const STRIPE_SIGNING_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "Scott Ymker Photography <scott@scottymkerphotos.com>";
const REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL || "scott@scottymkerphotos.com";
const EMAIL_BCC = process.env.EMAIL_BCC || ""; // optional

// ---- helpers ----
const money = (c = 0) => Number(c || 0);
const fmtOrderNum = (id) => String(id || "").replace(/^cs_/i, "SYP-").toUpperCase();

// Mirror of your price tables (cents)
const PACKAGE_PRICES = { A:3200, A1:4100, B:2700, B1:3200, C:2200, C1:2700, D:1800, D1:2300, E:1200, E1:1700 };
const ADDON_PRICES   = { F:600, G:600, H:600, I:1800, J:600, K:600, L:700, M:800, N:1500 };

// Verify Stripe signature (raw body)
function verifyStripeSig(raw, sig, secret) {
  // Using Stripe's recommended scheme v1 signature check
  // Accept any timestamp; Netlify cold starts can shift a bit
  if (!sig || !secret) return false;
  const parts = Object.fromEntries(sig.split(",").map(p => p.trim().split("=")));
  if (!parts.t || !parts.v1) return false;
  const signed = `${parts.t}.${raw}`;
  const expected = crypto.createHmac("sha256", secret).update(signed).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected));
}

// Send email via Resend
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
    const j = await res.text().catch(() => "");
    throw new Error(`Resend error ${res.status}: ${j}`);
  }
}

// (Optional) Append to Google Sheet if webhook app URL is set
async function appendToSheet({ webAppUrl, row }) {
  if (!webAppUrl) return;
  const r = await fetch(webAppUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(row),
  });
  // don’t throw on sheets; log only
  if (!r.ok) console.warn("Sheets append failed", await r.text().catch(()=>("")));
}

exports.handler = async (event) => {
  try {
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

    // Reconstruct students from metadata s1_*, s2_* ...
    const students = [];
    for (let i = 1; i <= 12; i++) {
      const name = md[`s${i}_name`] || "";
      const pkg = (md[`s${i}_pkg`] || "").toUpperCase();
      const addons = (md[`s${i}_addons`] || "")
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);

      if (!name && !pkg && !addons.length) continue;

      // per-student total
      let amount = 0;
      if (pkg && PACKAGE_PRICES[pkg] != null) amount += PACKAGE_PRICES[pkg];
      addons.forEach((code) => {
        if (ADDON_PRICES[code] != null) amount += ADDON_PRICES[code];
      });

      students.push({
        name,
        pkg,
        addons,
        amountCents: amount,
      });
    }

    // Order number + times + totals
    const orderNumber = fmtOrderNum(session.id);
    const totalCents = money(session.amount_total);
    const currency = session.currency || "usd";
    const paidAtISO = new Date((session.created || Math.floor(Date.now()/1000)) * 1000).toISOString();

    // Receipt URL (your success page)
    const origin =
      process.env.PUBLIC_BASE_URL ||
      `https://${event.headers.host}`;
    const receiptUrl = `${origin.replace(/\/+$/,"")}/success.html?session_id=${encodeURIComponent(session.id)}`;

    // Build & send email
    const html = modernReceipt2({
      businessName: "Scott Ymker Photography",
      logoUrl: `${origin.replace(/\/+$/,"")}/2020Logo_black.png`,
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
      to: parentEmail || EMAIL_BCC || REPLY_TO_EMAIL, // always send somewhere
      subject: `Receipt • ${orderNumber} • Scott Ymker Photography`,
      html,
    });

    // Optional Google Sheets append (single row summary)
    // NOTE: If you want every student on its own row, loop here.
    const SHEETS_WEB_APP_URL = process.env.SHEETS_WEB_APP_URL || "";
    if (SHEETS_WEB_APP_URL) {
      const packagesJoined = students
        .map((s) => [s.pkg, ...(s.addons || [])].filter(Boolean).join(", "))
        .join(" | ");

      await appendToSheet({
        webAppUrl: SHEETS_WEB_APP_URL,
        row: {
          orderNumber,
          parentEmail,
          packages: packagesJoined,
          // If you want first student name/grade/teacher from metadata:
          firstName: (md["s1_name"] || "").split(" ").slice(0, -1).join(""),
          lastName:  (md["s1_name"] || "").split(" ").slice(-1).join(""),
          grade: md["s1_grade"] || "",
          teacher: md["s1_teacher"] || "",
          background: md["s1_bg"] || "",
          total: (totalCents/100).toFixed(2),
          paidAt: paidAtISO,
        },
      });
    }

    console.info("webhook.ok {");
    console.info("  orderNumber:", `'${orderNumber}',`);
    console.info("  parentEmail:", `'${parentEmail}',`);
    console.info("  hasProvider:", !!RESEND_API_KEY);
    console.info("}");

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("webhook.error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
