'use strict';

const crypto = require('crypto');
const { modernReceipt } = require('./_emails/templates');

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const STRIPE_SECRET_KEY     = process.env.STRIPE_SECRET_KEY || '';
const SHEETS_WEBAPP_URL     = process.env.SHEETS_WEBAPP_URL || '';
const EMAIL_FROM            = process.env.EMAIL_FROM || 'Scott Ymker Photography <no-reply@scottymkerphotos.com>';
const REPLY_TO              = process.env.REPLY_TO || '';
const RESEND_API_KEY        = process.env.RESEND_API_KEY || '';
const SENDGRID_API_KEY      = process.env.SENDGRID_API_KEY || '';
const DEBUG_EMAIL_TO        = process.env.DEBUG_EMAIL_TO || '';
const SITE_URL              = process.env.SITE_URL || 'https://schools.scottymkerphotos.com';

const BRAND_NAME = 'Scott Ymker Photography';
const BRAND_LOGO = `${SITE_URL.replace(/\/$/, '')}/2020Logo_black.png`;

function timedSafeEqual(a, b) {
  const A = Buffer.from(a || '');
  const B = Buffer.from(b || '');
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

function verifyStripeSignature(rawBody, sigHeader, secret, tol = 300) {
  if (!sigHeader || !secret) return false;
  const parts = Object.fromEntries(
    sigHeader.split(',').map(s => s.split('=').map(x => x.trim()))
  );
  const t  = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;

  const payload  = `${t}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(t)) > tol) return false;

  return timedSafeEqual(v1, expected);
}

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error?.message || data.error || res.statusText);
    err.status = res.status;
    err.body   = data;
    throw err;
  }
  return data;
}

function makeOrderNumber(sessionId, created) {
  const d = new Date((created || Date.now() / 1000) * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const suffix = (sessionId || '').slice(-6).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `SYP-${y}${m}${day}-${suffix}`;
}

function safe(s) { return (s || '').toString().trim(); }

function pickParentEmail(session, md) {
  return session.customer_details?.email || session.customer_email || md.parent_email || '';
}

function packageLineFrom(md, k) {
  const pkg    = safe(md[`s${k}_pkg`]);
  const addons = safe(md[`s${k}_addons`]);
  return [pkg, addons].filter(Boolean).join(', ');
}

function collectStudentsFromMetadata(md) {
  const list = [];
  const count = Number(md.students_count || '0') || 0;
  for (let i = 1; i <= count; i++) {
    const nameField = safe(md[`s${i}_name`]);
    const first = safe(md[`s${i}_first`]);
    const last  = safe(md[`s${i}_last`]);
    const name = nameField || [first, last].filter(Boolean).join(' ') || `Student ${i}`;
    list.push({
      index: i,
      name,
      first, last,
      teacher: safe(md[`s${i}_teacher`]),
      grade  : safe(md[`s${i}_grade`]),
      bg     : safe(md[`s${i}_bg`]) || 'F1',
      pkg    : safe(md[`s${i}_pkg`]),
      addons : safe(md[`s${i}_addons`]),
      packageLine: packageLineFrom(md, i),
      amount : null,
    });
  }
  return list;
}

function assignAmountsFromLineItems(students, lineItems) {
  if (!Array.isArray(students) || !Array.isArray(lineItems)) return students;
  students.forEach(s => (s.amount = 0));
  lineItems.forEach(li => {
    const desc = li.description || '';
    const namePrefix = desc.split(' — ')[0].trim();
    const total = (li.amount_total != null ? li.amount_total : (li.amount_subtotal ?? 0)) * 1;
    const target = students.find(s => s.name === namePrefix);
    if (target) target.amount += total;
  });
  return students;
}

async function appendRowsToSheets(rows) {
  if (!SHEETS_WEBAPP_URL) return { ok: false, skipped: true };
  const r = await fetch(SHEETS_WEBAPP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows }),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`Sheets error ${r.status}: ${txt}`);
  return { ok: true, body: txt };
}

// Email providers
async function sendWithResend({ to, subject, html, text }) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
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
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
}

async function sendWithSendgrid({ to, subject, html, text }) {
  const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: {
        email: EMAIL_FROM.match(/<([^>]+)>/)?.[1] || EMAIL_FROM,
        name : EMAIL_FROM.replace(/<[^>]+>/g, '').trim() || BRAND_NAME,
      },
      reply_to: REPLY_TO ? { email: REPLY_TO.match(/<([^>]+)>/)?.[1] || REPLY_TO } : undefined,
      subject,
      content: [
        { type: 'text/plain', value: text || '' },
        { type: 'text/html' , value: html || '' },
      ],
    }),
  });
  if (!r.ok) throw new Error(`SendGrid ${r.status}: ${await r.text()}`);
}

async function sendEmail(to, subject, html, text) {
  if (!to) throw new Error('Missing recipient');
  if (RESEND_API_KEY) return sendWithResend({ to, subject, html, text });
  if (SENDGRID_API_KEY) return sendWithSendgrid({ to, subject, html, text });
  throw new Error('No email provider configured');
}

async function handler(event) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers: { Allow: 'POST' }, body: 'Method Not Allowed' };
    }

    const raw = event.body || '';
    const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
    if (!verifyStripeSignature(raw, sig, STRIPE_WEBHOOK_SECRET)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid signature' }) };
    }

    const payload = JSON.parse(raw);
    if (payload.type !== 'checkout.session.completed') {
      return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: true }) };
    }

    const session = payload.data?.object || {};

    // Expand line_items & payment_intent (for amounts/receipt url)
    let expanded = session;
    try {
      if (STRIPE_SECRET_KEY) {
        expanded = await fetchJSON(
          `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(session.id)}?expand[]=line_items&expand[]=payment_intent`,
          { headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` } }
        );
      }
    } catch (e) {
      console.error('Expand fetch failed:', e.message);
    }

    const md          = expanded.metadata || session.metadata || {};
    const parentEmail = pickParentEmail(expanded, md);
    const toEmail     = parentEmail || DEBUG_EMAIL_TO || '';

    const orderNumber = makeOrderNumber(session.id, session.created);
    const amountTotal = expanded.amount_total ?? session.amount_total ?? 0;
    const currency    = expanded.currency || session.currency || 'usd';
    const receiptUrl  = expanded?.payment_intent?.charges?.data?.[0]?.receipt_url || '';
    const viewOrderUrl= `${SITE_URL.replace(/\/$/, '')}/success.html?session_id=${encodeURIComponent(session.id)}`;

    let students = collectStudentsFromMetadata(md);
    const lineItems = expanded.line_items?.data || [];
    if (students.length && lineItems.length) {
      students = assignAmountsFromLineItems(students, lineItems);
    }

    // Sheets rows
    const rows = students.length ? students.map((s) => ({
      order_number: orderNumber,
      parent_email: parentEmail || '',
      first: s.first || '',
      last : s.last  || '',
      grade: s.grade || '',
      teacher: s.teacher || '',
      background: s.bg || '',
      package: s.pkg || '',
      addons : s.addons || '',
      package_and_addons: s.packageLine || '',
      student_display: s.name || '',
      total_cents_for_student: s.amount != null ? s.amount : '',
      session_id: session.id,
      created: new Date((session.created || Date.now()/1000) * 1000).toISOString()
    })) : [{
      order_number: orderNumber,
      parent_email: parentEmail || '',
      first: '',
      last : '',
      grade: '',
      teacher: '',
      background: md.background || '',
      package: md.package || '',
      addons : md.addons || '',
      package_and_addons: [md.package, md.addons].filter(Boolean).join(', '),
      student_display: '',
      total_cents_for_student: amountTotal || '',
      session_id: session.id,
      created: new Date((session.created || Date.now()/1000) * 1000).toISOString()
    }];

    if (SHEETS_WEBAPP_URL) {
      try {
        await appendRowsToSheets(rows);
        console.log(`Sheets appended 1 row(s) for order ${orderNumber}`);
      } catch (err) {
        console.error('Sheets append error:', err.message);
      }
    }

    const hasProvider = !!(RESEND_API_KEY || SENDGRID_API_KEY);
    console.log('webhook.ok {');
    console.log("  orderNumber:", `'${orderNumber}',`);
    console.log("  parentEmail:", `'${parentEmail}',`);
    console.log("  hasProvider:", hasProvider);
    console.log('}');

    if (hasProvider && toEmail) {
      let pmBrand = '', pmLast4 = '';
      try {
        const ch = expanded?.payment_intent?.charges?.data?.[0];
        pmBrand = ch?.payment_method_details?.card?.brand || '';
        pmLast4 = ch?.payment_method_details?.card?.last4 || '';
      } catch (_) {}

      const { subject, html, text } = modernReceipt({
        brandName: BRAND_NAME,
        logoUrl  : BRAND_LOGO,
        orderNumber,
        created  : session.created,
        total    : amountTotal,
        currency,
        parentEmail: toEmail,
        receiptUrl,
        viewOrderUrl,
        students,
        pmBrand,
        pmLast4,
      });

      try {
        console.log('email.sending', { to: toEmail });
        await sendEmail(toEmail, subject, html, text);
        console.log('email.sent', { to: toEmail });
      } catch (err) {
        console.error('Email send error:', err.message);
      }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error', details: String(err) }) };
  }
}

module.exports = { handler };
