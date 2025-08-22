// netlify/functions/stripe-webhook.js
const crypto = require("crypto");
const { modernReceipt } = require("./_emails/templates");

// ===== Required env =====
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const SHEETS_WEBAPP_URL     = process.env.SHEETS_WEBAPP_URL;

// ===== Optional (email + extras) =====
const RESEND_API_KEY     = process.env.RESEND_API_KEY;
const SENDGRID_API_KEY   = process.env.SENDGRID_API_KEY;
const EMAIL_FROM         = process.env.EMAIL_FROM || "orders@example.com";
const REPLY_TO           = process.env.REPLY_TO || "";
const SITE_URL           = (process.env.SITE_URL || "").replace(/\/+$/,""); // no trailing slash
const BRAND_NAME         = "Scott Ymker Photography";
const STRIPE_SECRET_KEY  = process.env.STRIPE_SECRET_KEY; // optional enrichment
const DEBUG_EMAIL_TO     = process.env.DEBUG_EMAIL_TO || ""; // optional fallback for testing

// ---------- utils ----------
const money = (cents, cur="usd") =>
  (Number(cents||0)/100).toLocaleString(undefined,{style:"currency",currency:cur.toUpperCase()});

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
  const parsed = parseStripeSig(sigHeader || "");
  const t = parsed.t?.[0];
  const v1s = parsed.v1 || [];
  if (!t || !v1s.length) return false;

  const expected = crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const ts = Number(t);
  if (!Number.isFinite(ts) || Math.abs(Date.now()/1000 - ts) > toleranceSec) return false;
  return v1s.some(v1 => secureCompare(v1, expected));
}
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
  const yyyy = d.getFullYear(), mm = String(d.getMonth()+1).padStart(2,"0"), dd = String(d.getDate()).padStart(2,"0");
  return `SYP-${yyyy}${mm}${dd}-${tail}`;
}

// Stripe REST fetch (for enrichment)
async function fetchStripe(path) {
  if (!STRIPE_SECRET_KEY) return null;
  const res = await fetch(`https://api.stripe.com${path}`, {
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` }
  });
  if (!res.ok) return null;
  return await res.json();
}

// Email sender (Resend preferred, SendGrid fallback)
async function sendEmail({ to, subject, html, text }) {
  if (RESEND_API_KEY) {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: Array.isArray(to) ? to : [to],
        subject, html, text,
        reply_to: REPLY_TO || undefined
      })
    });
    if (!resp.ok) throw new Error(`Resend error: ${await resp.text()}`);
    return;
  }
  if (SENDGRID_API_KEY) {
    const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: Array.isArray(to) ? to[0] : to }], ...(REPLY_TO ? { reply_to: { email: REPLY_TO } } : {}) }],
        from: { email: EMAIL_FROM.replace(/.*<|>.*/g,"") || EMAIL_FROM, name: EMAIL_FROM.includes("<") ? EMAIL_FROM.split("<")[0].trim() : BRAND_NAME },
        subject,
        content: [{ type: "text/html", value: html }],
      })
    });
    if (!resp.ok) throw new Error(`SendGrid error: ${await resp.text()}`);
    return;
  }
  console.warn("No email provider configured; skipping email.");
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      // Stripe uses POST. Hitting this URL in a browser is a GET and will show 405; that's expected.
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
    const parentEmail = (session.customer_email || md.parent_email || "").trim();

    console.log("webhook.ok", {
      orderNumber,
      parentEmail,
      hasProvider: !!(RESEND_API_KEY || SENDGRID_API_KEY)
    });

    // ----- Build rows & students summary -----
    const rows = [];
    const students = [];
    const count = getStudentCount(md);

    for (let i = 1; i <= count; i++) {
      const fullName = md[`s${i}_name`] || "";
      const [first, last] = splitFirstLast(fullName);
      const grade   = md[`s${i}_grade`]   || "";
      const teacher = md[`s${i}_teacher`] || "";
      const pkg     = (md[`s${i}_pkg`]    || "").trim();
      const bg      = md[`s${i}_bg`]      || (md.background || "");
      const addonsRaw = md[`s${i}_addons`] || ""; // "F, H" etc.

      const addonCodes = addonsRaw
        .split(/[,; ]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
      const packageCombined = [pkg, ...addonCodes].filter(Boolean).join(", ");

      // Append to Google Sheet
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

      // For the receipt email table
      students.push({
        name: fullName || `Student ${i}`,
        teacher, grade, bg,
        packageLine: packageCombined,
        amount: null // filled if we can apportion from line_items
      });
    }

    // ----- Append to Google Sheets (best-effort) -----
    if (rows.length) {
      try {
        const resp = await fetch(SHEETS_WEBAPP_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows })
        });
        if (!resp.ok) {
          const text = await resp.text();
          console.error("Sheets error:", text);
        } else {
          console.log(`Sheets appended ${rows.length} row(s) for order ${orderNumber}`);
        }
      } catch (e) {
        console.error("Sheets request failed:", e);
      }
    }

    // ----- Email receipt (best-effort) -----
    if ((parentEmail || DEBUG_EMAIL_TO) && (RESEND_API_KEY || SENDGRID_API_KEY)) {
      try {
        let amountTotal = session.amount_total || 0;
        let currency    = session.currency || "usd";
        let receiptUrl  = "";
        let pmBrand = "", pmLast4 = "";

        // Expand session line_items for totals; PI->charge for receipt + card brand/last4
        const s = await fetchStripe(`/v1/checkout/sessions/${session.id}?expand[]=line_items`);
        if (s) {
          amountTotal = s.amount_total ?? amountTotal;
          currency    = s.currency ?? currency;
        }
        if (session.payment_intent) {
          const pi = await fetchStripe(`/v1/payment_intents/${session.payment_intent}?expand[]=charges.data.payment_method_details.card`);
          const charge = pi?.charges?.data?.[0];
          if (charge) {
            receiptUrl = charge.receipt_url || receiptUrl;
            const card = charge.payment_method_details?.card;
            if (card) { pmBrand = card.brand || ""; pmLast4 = card.last4 || ""; }
          }
        }

        // Try to apportion amounts by matching line item names "<Student> — ..."
        if (s?.line_items?.data?.length && students.length) {
          const map = new Map(students.map((st, i) => [st.name, i]));
          s.line_items.data.forEach(li => {
            const name = (li.description || li.price?.product || li.price?.nickname || li.price?.id || "");
            const studentKey = (name.split(" — ")[0] || "").trim();
            const idx = map.get(studentKey);
            const liTotal = (li.amount_total != null ? li.amount_total : ((li.price?.unit_amount || 0) * (li.quantity || 1)));
            if (idx != null) {
              students[idx].amount = (students[idx].amount || 0) + liTotal;
            }
          });
        }

        const logoUrl      = SITE_URL ? `${SITE_URL}/2020Logo_black.png` : "";
        const viewOrderUrl = SITE_URL ? `${SITE_URL}/success.html?session_id=${encodeURIComponent(session.id)}` : "";

        const { subject, html, text } = modernReceipt({
          brandName: BRAND_NAME,
          logoUrl,
          orderNumber,
          created: session.created || Math.floor(Date.now()/1000),
          total: amountTotal,
          currency,
          parentEmail,
          receiptUrl,
          viewOrderUrl,
          students,
          pmBrand,
          pmLast4
        });

        const target = parentEmail || DEBUG_EMAIL_TO; // fallback for testing
        console.log("email.sending", { to: target, orderNumber });
        await sendEmail({ to: target, subject, html, text });
        console.log("email.sent", { to: target });
      } catch (e) {
        console.error("Email send error:", e);
      }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("Webhook error:", err);
    // Return 200 so Stripe doesn't endlessly retry; logs will show details.
    return { statusCode: 200, body: "ok" };
  }
};
