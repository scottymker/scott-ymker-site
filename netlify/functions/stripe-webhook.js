// netlify/functions/stripe-webhook.js
// CommonJS, no Stripe SDK. Verifies signature with crypto, appends to Sheets (optional),
// sends receipt via Resend, and returns 200.

const crypto = require('crypto');
const { renderReceipt } = require('./_emails/templates.js');

const fetch = global.fetch;

const SITE_ORIGIN = process.env.SITE_ORIGIN || 'https://schools.scottymkerphotos.com';
const EMAIL_FROM  = process.env.EMAIL_FROM || 'Scott Ymker Photography <scott@scottymkerphotos.com>';
const REPLY_TO    = process.env.EMAIL_REPLY_TO || 'scott@scottymkerphotos.com';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SHEETS_WEB_APP_URL = process.env.SHEETS_WEB_APP_URL;

// --- helpers ---
const timingSafeEq = (a, b) => {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
};

function verifyStripeSignature({ rawBody, sigHeader, secret }) {
  // Stripe-Signature: t=timestamp,v1=hex,...
  if (!sigHeader || !secret) return false;
  const parts = Object.fromEntries(
    sigHeader.split(',').map(kv => {
      const [k, v] = kv.split('=');
      return [k, v];
    })
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;

  const signedPayload = `${t}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return timingSafeEq(expected, v1);
}

const fmtMoney = (cents, cur='usd') =>
  (Number(cents || 0)/100).toLocaleString(undefined, { style:'currency', currency: cur.toUpperCase() });

const nowIso = () => new Date().toISOString();

// --- Netlify handler ---
exports.handler = async (event) => {
  // Health check in browser
  if (event.httpMethod === 'GET') return { statusCode: 200, body: 'ok' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sigHeader = event.headers['stripe-signature'];
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : (event.body || '');

  // Verify signature manually
  try {
    if (!verifyStripeSignature({ rawBody, sigHeader, secret })) {
      return { statusCode: 400, body: 'Invalid Stripe signature' };
    }
  } catch (err) {
    return { statusCode: 400, body: 'Signature verification error' };
  }

  // Parse the event
  let received;
  try { received = JSON.parse(rawBody); }
  catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  const type = received?.type || '';
  if (type !== 'checkout.session.completed') {
    return { statusCode: 200, body: JSON.stringify({ ok: true, ignored: type }) };
  }

  const session = received?.data?.object || {};
  const currency = session.currency || 'usd';
  const total = session.amount_total || 0;

  // Build human order number
  const d = new Date();
  const y = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  const rand = Math.random().toString(36).slice(2,7).toUpperCase();
  const orderNumber = `SYP-${y}${mm}${dd}-${rand}`;

  const md = session.metadata || {};
  const parentEmail =
    session.customer_email ||
    session?.customer_details?.email ||
    md.parent_email || '';

  // collect students from metadata
  const count = Math.max(1, Math.min(12, Number(md.students_count || 1)));
  const students = [];
  for (let i = 1; i <= count; i++) {
    const name = md[`s${i}_name`] || [md[`s${i}_first`], md[`s${i}_last`]].filter(Boolean).join(' ');
    const teacher = md[`s${i}_teacher`] || '';
    const grade = md[`s${i}_grade`] || '';
    const bg = md[`s${i}_bg`] || '';
    const pkg = (md[`s${i}_pkg`] || '').toUpperCase();
    const addons = (md[`s${i}_addons`] || '')
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);
    students.push({ name, teacher, grade, bg, pkg, addons });
  }

  // Append to Google Sheets (optional)
  try {
    if (!SHEETS_WEB_APP_URL) {
      console.warn('SHEETS_WEB_APP_URL not set; skipping Sheets append');
    } else {
      const rows = students.map(s => ({
        timestamp: nowIso(),
        order_number: orderNumber,
        parent_email: parentEmail || '',
        student_name: s.name || '',
        teacher: s.teacher || '',
        grade: s.grade || '',
        background: s.bg || '',
        packages: [s.pkg, ...(s.addons || [])].filter(Boolean).join(', ')
      }));
      await fetch(SHEETS_WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows })
      });
    }
  } catch (e) {
    console.error('Sheets append failed:', e);
  }

  // Build receipt HTML
  const paidAt = session.created ? new Date(session.created * 1000) : new Date();
  const paidStr = paidAt.toLocaleString(undefined, {
    year:'numeric', month:'short', day:'numeric', hour:'numeric', minute:'2-digit'
  });

  const successUrl = `${SITE_ORIGIN}/success.html?session_id=${encodeURIComponent(session.id || '')}`;

  const html = renderReceipt({
    brandName: 'Scott Ymker Photography',
    logoUrl: `${SITE_ORIGIN}/2020Logo_black.png`,
    amount_cents: total,
    currency_code: currency,
    paid_at_str: paidStr,
    order_number: orderNumber,
    receipt_url: successUrl,
    parent_email: parentEmail,
    students: students.map(s => ({
      name: s.name, teacher: s.teacher, grade: s.grade, bg: s.bg, pkg: s.pkg, addons: s.addons
    })),
    contact: { email: 'scott@scottymkerphotos.com', phone: '605-550-0828', site: 'scottymkerphotos.com' }
  });

  // Send email via Resend (no SDK)
  try {
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY missing');
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [parentEmail].filter(Boolean),
        subject: `Receipt • ${orderNumber} • ${fmtMoney(total, currency)}`,
        html,
        reply_to: REPLY_TO
      })
    });
    const j = await r.json();
    if (!r.ok) { console.error('Resend error:', j); }
    else { console.info('email.sent', j); }
  } catch (err) {
    console.error('Email send failed:', err);
  }

  console.info('webhook.ok {',
    '\n  orderNumber:', `'${orderNumber}',`,
    '\n  parentEmail:', `'${parentEmail}',`,
    '\n}');

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
