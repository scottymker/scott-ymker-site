// CommonJS Netlify function. Verifies Stripe webhook, appends to Google Sheet (optional),
// and emails a styled receipt via Resend.

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { renderReceipt, PACKAGE_BREAKDOWN } = require('./_emails/templates.js');
const fetch = global.fetch; // Netlify runtime has fetch

// Helpers
const fmtMoney = (c, cur='usd') => (Number(c || 0)/100).toLocaleString(undefined,{style:'currency',currency:cur.toUpperCase()});
const nowIso = () => new Date().toISOString();
const siteOrigin = process.env.SITE_ORIGIN || 'https://schools.scottymkerphotos.com';
const EMAIL_FROM = process.env.EMAIL_FROM || 'Scott Ymker Photography <scott@scottymkerphotos.com>';
const REPLY_TO   = process.env.EMAIL_REPLY_TO || 'scott@scottymkerphotos.com';
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Optional Apps Script endpoint to append rows
const SHEETS_WEB_APP_URL = process.env.SHEETS_WEB_APP_URL;

// Simple GET health-check so visiting the endpoint in a browser returns 200
exports.handler = async (event) => {
  if (event.httpMethod === 'GET') {
    return { statusCode: 200, body: 'ok' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const sig = event.headers['stripe-signature'];
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let evt;
  try {
    evt = stripe.webhooks.constructEvent(event.body, sig, whSecret);
  } catch (err) {
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (evt.type !== 'checkout.session.completed') {
    return { statusCode: 200, body: JSON.stringify({ ok: true, ignored: evt.type }) };
  }

  const session = evt.data.object || {};
  const currency = session.currency || 'usd';
  const total = session.amount_total || 0;

  // Build order number (stable + human friendly)
  const d = new Date();
  const y = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  const rand = Math.random().toString(36).slice(2,7).toUpperCase();
  const orderNumber = `SYP-${y}${mm}${dd}-${rand}`;

  const md = session.metadata || {};
  const parentEmail =
    session.customer_email ||
    (session.customer_details && session.customer_details.email) ||
    md.parent_email || '';

  // Parse students from metadata (from multi-order)
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

  // Append to Google Sheet (optional)
  try {
    if (!SHEETS_WEB_APP_URL) {
      console.warn('SHEETS_WEB_APP_URL not set; skipping Sheets append');
    } else {
      // Build rows: one row per student
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
    // continue
  }

  // Build receipt HTML
  const paidAt = session.created ? new Date(session.created * 1000) : new Date();
  const paidStr = paidAt.toLocaleString(undefined, {
    year:'numeric', month:'short', day:'numeric',
    hour:'numeric', minute:'2-digit'
  });

  const successUrl = `${siteOrigin}/success.html?session_id=${encodeURIComponent(session.id || '')}`;

  const html = renderReceipt({
    brandName: 'Scott Ymker Photography',
    logoUrl: `${siteOrigin}/2020Logo_black.png`,
    amount_cents: total,
    currency_code: currency,
    paid_at_str: paidStr,
    order_number: orderNumber,
    receipt_url: successUrl,
    parent_email: parentEmail,
    students: students.map(s => ({
      name: s.name,
      teacher: s.teacher,
      grade: s.grade,
      bg: s.bg,
      pkg: s.pkg,
      addons: s.addons
    })),
    contact: {
      email: 'scott@scottymkerphotos.com',
      phone: '605-550-0828',
      site: 'scottymkerphotos.com'
    }
  });

  // Send email via Resend
  try {
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY missing');

    const emailResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [parentEmail].filter(Boolean),
        subject: `Receipt • ${orderNumber} • ${fmtMoney(total, currency)}`,
        html,
        reply_to: REPLY_TO
      })
    });
    const emailJson = await emailResp.json();
    if (!emailResp.ok) {
      console.error('Resend error:', emailJson);
      throw new Error(emailJson.error || 'Resend failed');
    } else {
      console.info('email.sent', emailJson);
    }
  } catch (err) {
    console.error('Email send failed:', err);
    // do not fail webhook because of email issues
  }

  console.info('webhook.ok {',
    '\n  orderNumber:', `'${orderNumber}',`,
    '\n  parentEmail:', `'${parentEmail}',`,
    '\n}');

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
