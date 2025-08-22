// netlify/functions/stripe-webhook.js
// Plain Fetch + HMAC verification (no Stripe SDK) so it stays bundle-free.

const crypto = require("crypto");
const { modernReceipt } = require("./_emails/templates");

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ""; // used to expand line items
const SHEETS_WEBAPP_URL = process.env.SHEETS_WEBAPP_URL || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "Scott Ymker Photography <no-reply@scottymkerphotos.com>";
const REPLY_TO = process.env.REPLY_TO || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const DEBUG_EMAIL_TO = process.env.DEBUG_EMAIL_TO || "";
const SITE_URL = process.env.SITE_URL || "https://schools.scottymkerphotos.com";

const BRAND_NAME = "Scott Ymker Photography";
const BRAND_LOGO = `${SITE_URL.replace(/\/$/,"")}/2020Logo_black.png`;

// ---- helpers ----------------------------------------------------------------

function timedSafeEqual(a, b) {
  const buffA = Buffer.from(a);
  const buffB = Buffer.from(b);
  if (buffA.length !== buffB.length) return false;
  return crypto.timingSafeEqual(buffA, buffB);
}

// Verify Stripe signature header (v1) with 5 min tolerance
function verifyStripeSignature(rawBody, sigHeader, secret, toleranceSec = 300) {
  if (!sigHeader || !secret) return false;
  const parts = Object.fromEntries(
    sigHeader.split(",").map((kv) => kv.split("=").map((s) => s.trim()))
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;

  const payload = `${t}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");

  // Time tolerance
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(t)) > toleranceSec) return false;

  return timedSafeEqual(v1, expected);
}

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error?.message || data.error || res.statusText);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

function makeOrderNumber(sessionId, created) {
  const d = new Date((created || Date.now() / 1000) * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const suffix = (sessionId || "").slice(-6).toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `SYP-${y}${m}${dd}-${suffix}`;
}

function pickParentEmail(session, md) {
  return (
    session.customer_details?.email ||
    session.customer_email ||
    md.parent_email ||
    ""
  );
}

function packageLineFrom(md, k) {
  const pkg = (md[`s${k}_pkg`] || "").trim();
  const addons = (md[`s${k}_addons`] || "").trim();
  return [pkg, addons].filter(Boolean).join(", ");
}

function collectStudentsFromMetadata(md) {
  const out = [];
  const count = Number(md.students_count || "0") || 0;
  for (let i = 1; i <= count; i++) {
    const first = (md[`s${i}_name`] || md[`s${i}_first`] || "").toString().trim();
    const last = (md[`s${i}_last`] || "").toString().trim();
    const name = [first, last].filter(Boolean).join(" ").trim() || first || last || `Student ${i}`;
    out.push({
      index: i,
      name,
      first: first || "",
      last: last || "",
      teacher: (md[`s${i}_teacher`] || "").toString().trim(),
      grade: (md[`s${i}_grade`] || "").toString().trim(),
      bg: (md[`s${i}_bg`] || "").toString().trim(),
      pkg: (md[`s${i}_pkg`] || "").toString().trim(),
      addons: (md[`s${i}_addons`] || "").toString().trim(),
      packageLine: packageLineFrom(md, i),
      amount: null, // filled from line_items if we can
    });
  }
  return out;
}

function assignAmountsFromLineItems(students, lineItems) {
  if (!Array.isArray(students) || !Array.isArray(lineItems)) return students;
  // Your line item names were created as:
  //  - `${studentName} — Package ${code}`
  //  - `${studentName} — Add-on ${code} — ${prettyName}`
  students.forEach((s) => (s.amount = 0));
  lineItems.forEach((li) => {
    const desc = li.description || li.price?.product || li.price?.nickname || li.display_name || li?.price?.id || "";
    const name = li.description || li?.price?.product || "";
    const full = (li?.description || li?.price?.product || li?.price?.nickname || "").toString();
    const qty = li.quantity ?? 1;
    const total = (li.amount_total != null ? li.amount_total : (li.amount_subtotal ?? 0)) * 1;
    // Try to extract the student name prefix before " — "
    const n = (li.description || "").split(" — ")[0].trim();
    const target = students.find((s) => s.name === n);
    if (target) {
      target.amount = (target.amount || 0) + total;
    }
  });
  return students;
}

async function appendRowsToSheets(rows) {
  if (!SHEETS_WEBAPP_URL) return { ok: false, skipped: true };
  const res = await fetch(SHEETS_WEBAPP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows }),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`Sheets error ${res.status}: ${txt}`);
  return { ok: true, body: txt };
}

// Resend
async function sendWithResend({ to, subject, html, text }) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      subject,
      html,
      text,
      reply_to: REPLY_TO || undefined,
    }),
  });
  if (!r.ok) {
    const b = await r.text();
    throw new Error(`Resend ${r.status}: ${b}`);
  }
}

// SendGrid
async function sendWithSendgrid({ to, subject, html, text }) {
  const r = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: EMAIL_FROM.match(/<([^>]+)>/)?.[1] || EMAIL_FROM, name: EMAIL_FROM.replace(/<[^>]+>/g, "").trim() || BRAND_NAME },
      reply_to: REPLY_TO ? { email: REPLY_TO.match(/<([^>]+)>/)?.[1] || REPLY_TO } : undefined,
      subject,
      content: [
        { type: "text/plain", value: text || "" },
        { type: "text/html", value: html || "" },
      ],
    }),
  });
  if (!r.ok) {
    const b = await r.text();
    throw new Error(`SendGrid ${r.status}: ${b}`);
  }
}

async function sendEmail(to, subject, html, text) {
  if (!to) throw new Error("Missing recipient");
  const hasResend = !!RESEND_API_KEY;
  const hasSendgrid = !!SENDGRID_API_KEY;
  if (!hasResend && !hasSendgrid) throw new Error("No email provider key set");
  if (hasResend) return sendWithResend({ to, subject, html, text });
  return sendWithSendgrid({ to, subject, html, text });
}

// ---- handler ----------------------------------------------------------------

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: { "Allow": "POST" },
        body: "Method Not Allowed",
      };
    }

    const raw = event.body || "";
    const sig = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];

    if (!verifyStripeSignature(raw, sig, STRIPE_WEBHOOK_SECRET)) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid signature" }) };
    }

    const payload = JSON.parse(raw);
    const type = payload.type;
    const session = payload.data?.object || {};

    if (type !== "checkout.session.completed") {
      return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: true }) };
    }

    // Pull expanded details (line items & PI) when possible
    let expanded = session;
    try {
      if (STRIPE_SECRET_KEY) {
        const se = await fetchJSON(
          `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(session.id)}?expand[]=line_items&expand[]=payment_intent`,
          { headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` } }
        );
        expanded = se;
      }
    } catch (e) {
      console.error("Expand fetch failed:", e.message);
      // keep using session bare object
    }

    const md = expanded.metadata || session.metadata || {};
    const parentEmail = pickParentEmail(expanded, md);
    const toEmail = parentEmail || DEBUG_EMAIL_TO || "";

    const orderNumber = makeOrderNumber(session.id, session.created);
    const amountTotal = expanded.amount_total ?? session.amount_total ?? 0;
    const currency = expanded.currency || session.currency || "usd";
    const receiptUrl = expanded?.payment_intent?.charges?.data?.[0]?.receipt_url || "";
    const viewOrderUrl = `${SITE_URL.replace(/\/$/,"")}/success.html?session_id=${encodeURIComponent(session.id)}`;

    // Students: from metadata
    let students = collectStudentsFromMetadata(md);

    // Try to attach amounts from line_items (grouped by student name prefix)
    const lineItems = expanded.line_items?.data || [];
    if (lineItems.length && students.length) {
      students = assignAmountsFromLineItems(students, lineItems);
    }

    // ----- Google Sheets (one row per student) -----
    const rows = students.length ? students.map((s) => ({
      order_number: orderNumber,
      parent_email: parentEmail || "",
      first: s.first || "",
      last: s.last || "",
      grade: s.grade || "",
      teacher: s.teacher || "",
      background: s.bg || "",
      package: s.pkg || "",
      addons: s.addons || "",
      package_and_addons: s.packageLine || "",
      student_display: s.name || "",
      total_cents_for_student: s.amount != null ? s.amount : "",
      session_id: session.id,
      created: new Date((session.created || Date.now()/1000) * 1000).toISOString()
    })) : [{
      order_number: orderNumber,
      parent_email: parentEmail || "",
      first: "",
      last: "",
      grade: "",
      teacher: "",
      background: md.background || "",
      package: md.package || "",
      addons: md.addons || "",
      package_and_addons: [md.package, md.addons].filter(Boolean).join(", "),
      student_display: "",
      total_cents_for_student: amountTotal || "",
      session_id: session.id,
      created: new Date((session.created || Date.now()/1000) * 1000).toISOString()
    }];

    if (SHEETS_WEBAPP_URL) {
      try {
        const out = await appendRowsToSheets(rows);
        console.log(`Sheets appended ${rows.length} row(s) for order ${orderNumber}`);
      } catch (err) {
        console.error("Sheets append error:", err.message);
      }
    }

    // ----- Email -----
    const hasProvider = !!(RESEND_API_KEY || SENDGRID_API_KEY);
    console.log("webhook.ok {");
    console.log("  orderNumber:", `'${orderNumber}',`);
    console.log("  parentEmail:", `'${parentEmail}',`);
    console.log("  hasProvider:", hasProvider);
    console.log("}");

    if (hasProvider && toEmail) {
      // Try to find card brand/last4 from PaymentIntent (if expanded)
      let pmBrand = "";
      let pmLast4 = "";
      try {
        const ch = expanded?.payment_intent?.charges?.data?.[0];
        pmBrand = ch?.payment_method_details?.card?.brand || "";
        pmLast4 = ch?.payment_method_details?.card?.last4 || "";
      } catch (_) {}

      const { subject, html, text } = modernReceipt({
        brandName: BRAND_NAME,
        logoUrl: BRAND_LOGO,
        orderNumber,
        created: session.created,
        total: amountTotal,
        currency,
        parentEmail: toEmail,
        receiptUrl,
        viewOrderUrl,
        students,
        pmBrand,
        pmLast4
      });

      try {
        console.log("email.sending", { to: toEmail });
        await sendEmail(toEmail, subject, html, text);
        console.log("email.sent", { to: toEmail });
      } catch (err) {
        console.error("Email send error:", err.message);
      }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "Server error", details: String(err) }) };
  }
};
