// netlify/functions/stripe-webhook.js
'use strict';

/**
 * ENV required:
 *  - SHEETS_WEB_APP_URL      (Apps Script Web App endpoint that accepts JSON POST)
 *  - RESEND_API_KEY          (Resend API key)
 *  - EMAIL_FROM              (e.g. 'Scott Ymker Photography <scott@scottymkerphotos.com>')
 * Optional:
 *  - EMAIL_BCC               (e.g. 'scott@scottymkerphotos.com')
 *  - REPLY_TO_EMAIL          (e.g. 'scott@scottymkerphotos.com')
 */

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const payload = JSON.parse(event.body || '{}');
    // Stripe sends the whole event wrapper; we only care about completed Checkout Session
    const type = payload.type || payload.event || '';
    const session = payload.data && payload.data.object ? payload.data.object : payload;

    if ((type && type !== 'checkout.session.completed') &&
        (session.object !== 'checkout.session')) {
      // Ignore unrelated events
      return json(200, { ok: true, ignored: true });
    }

    // ----- Extract values from the Checkout Session -----
    const sessionId     = session.id || '';
    const created       = session.created || Math.floor(Date.now()/1000);
    const currency      = (session.currency || 'usd').toLowerCase();
    const total         = session.amount_total || 0;
    const parentEmail   = session.customer_email || (session.customer_details && session.customer_details.email) || '';
    const parentPhone   = (session.customer_details && session.customer_details.phone) || '';
    const paymentStatus = session.payment_status || 'paid';
    const receiptUrl    = (session.latest_charge && session.latest_charge.receipt_url) || '';
    const pmBrand       = (session.payment_method_types && session.payment_method_types[0]) || '';
    const pmLast4       = (session.payment_method && session.payment_method.card && session.payment_method.card.last4) || '';

    const md = session.metadata || {};

    // Friendly order number from session id
    const orderNumber = buildOrderNumber(sessionId, created);

    // Collect students from metadata (s1_*, s2_* …)
    const students = collectStudentsFromMetadata(md, currency);

    // ---- Append to Google Sheets (same columns you already had working) ----
    // We keep: Timestamp, Order #, First, Last, Grade, Teacher, Packages, Background, Parent Email
    try {
      if (process.env.SHEETS_WEB_APP_URL) {
        const rows = students.map((s) => ([
          new Date().toISOString(),
          orderNumber,
          s.first,
          s.last,
          s.grade,
          s.teacher,
          s.packageLine,      // e.g. "B1, H"
          s.background || '',
          parentEmail
        ]));
        await appendToSheets(process.env.SHEETS_WEB_APP_URL, rows);
        console.log('Sheets appended', rows.length, 'row(s) for order', orderNumber);
      } else {
        console.warn('SHEETS_WEB_APP_URL not set; skipping Sheets append');
      }
    } catch (err) {
      console.error('Sheets append error:', err);
    }

    // ---- Send receipt email via Resend (inline template) ----
    try {
      const hasResend = !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;
      console.log('webhook.ok {');
      console.log('  orderNumber:', `'${orderNumber}',`);
      console.log('  parentEmail:', `'${parentEmail}',`);
      console.log('  hasProvider:', hasResend);
      console.log('}');

      if (hasResend && parentEmail) {
        const emailProps = {
          brandName: 'Scott Ymker Photography',
          logoUrl: absoluteLogoUrl(event),
          orderNumber,
          created,
          total,
          currency,
          parentEmail,
          receiptUrl,
          viewOrderUrl: successPageUrl(event, sessionId),
          students,
          pmBrand,
          pmLast4
        };
        const msg = modernReceipt(emailProps);

        await sendResendEmail({
          subject: msg.subject,
          html: msg.html,
          text: msg.text,
          to: parentEmail,
          from: process.env.EMAIL_FROM,
          bcc: process.env.EMAIL_BCC || '',
          replyTo: process.env.REPLY_TO_EMAIL || ''
        });
        console.log('email.sent { to:', parentEmail, '}');
      } else {
        console.warn('Resend not configured or no parentEmail; skipping email send');
      }
    } catch (err) {
      console.error('Email send error:', err);
      // Don’t fail the webhook because of email issues
    }

    return json(200, { ok: true });
  } catch (err) {
    console.error('webhook.fatal', err);
    return json(200, { ok: false, error: String(err && err.message || err) });
  }
};

/* ----------------------- Helpers ----------------------- */

function json(status, obj) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
}

function buildOrderNumber(sessionId, createdEpoch) {
  // Format: SYP-YYYYMMDD-XXXXXX  (6 from the tail of the id)
  const d = new Date((createdEpoch || Date.now()/1000) * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth()+1).padStart(2,'0');
  const day = String(d.getUTCDate()).padStart(2,'0');
  const tail = (sessionId || '').replace(/^cs_/, '').replace(/[^a-zA-Z0-9]/g,'').slice(-6).toUpperCase() || 'XXXXXX';
  return `SYP-${y}${m}${day}-${tail}`;
}

function collectStudentsFromMetadata(md, currency) {
  const out = [];
  const count = parseInt(md.students_count || md.student_count || md.count || '0', 10) || guessStudentCount(md);
  for (let i=1;i<=count;i++){
    const first = (md[`s${i}_name`] || md[`s${i}_first`] || '').split(' ')[0] || '';
    const last  = md[`s${i}_last`] || (md[`s${i}_name`] ? md[`s${i}_name`].split(' ').slice(1).join(' ') : '');
    const grade = md[`s${i}_grade`] || '';
    const teacher = md[`s${i}_teacher`] || '';
    const pkg  = (md[`s${i}_pkg`] || '').toUpperCase();
    const addons = (md[`s${i}_addons`] || '')
      .split(',')
      .map(s=>s.trim())
      .filter(Boolean)
      .join(', ');
    const background = md[`s${i}_bg`] || md[`s${i}_background`] || '';

    const packageLine = [pkg, addons].filter(Boolean).join(', '); // e.g. "B1, H"

    // If amounts per-student were not included, leave undefined
    const amount = md[`s${i}_amount`] ? Number(md[`s${i}_amount`]) : undefined;

    out.push({
      index:i, first, last,
      name: [first,last].filter(Boolean).join(' '),
      grade, teacher, pkg, addons,
      background, packageLine, amount, currency
    });
  }
  return out;
}

function guessStudentCount(md) {
  const keys = Object.keys(md||{});
  const set = new Set();
  keys.forEach(k=>{
    const m = k.match(/^s(\d+)_/);
    if (m) set.add(Number(m[1]));
  });
  return set.size || 1;
}

async function appendToSheets(webAppUrl, rows) {
  await fetch(webAppUrl, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ rows })
  });
}

async function sendResendEmail({ subject, html, text, to, from, bcc, replyTo }) {
  const payload = {
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text
  };
  if (bcc) payload.bcc = Array.isArray(bcc) ? bcc : [bcc];
  if (replyTo) payload.reply_to = replyTo;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const body = await res.text().catch(()=> '');
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}

/* ------------- Inline email template (no imports) ------------- */

const money = (cents = 0, currency = 'usd') =>
  (Number(cents) / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: String(currency || 'USD').toUpperCase(),
  });

function modernReceipt(props = {}) {
  const {
    brandName = 'Scott Ymker Photography',
    logoUrl = '',
    orderNumber = '',
    created,
    total = 0,
    currency = 'usd',
    parentEmail = '',
    receiptUrl = '',
    viewOrderUrl = '',
    students = [],
    pmBrand = '',
    pmLast4 = '',
  } = props;

  const createdStr = created
    ? new Date(created * 1000).toLocaleString()
    : new Date().toLocaleString();

  const subject = `Receipt ${orderNumber} — ${brandName}`;

  const studentRows = (students && students.length ? students : []).map((s) => {
    const line = s.packageLine || [s.pkg, s.addons].filter(Boolean).join(', ');
    const amt = s.amount != null ? money(s.amount, currency) : '';
    return `
      <tr>
        <td style="padding:8px 0;font-weight:600;">${escapeHtml(s.name || '')}</td>
        <td style="padding:8px 0;color:#555;">${escapeHtml(line || '')}</td>
        <td style="padding:8px 0;text-align:right;white-space:nowrap;">${amt}</td>
      </tr>`;
  }).join('');

  const pm = [pmBrand ? pmBrand.toUpperCase() : '', pmLast4 ? `•••• ${pmLast4}` : '']
    .filter(Boolean).join(' · ');

  const html = `<!doctype html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:#f6f7f9;padding:24px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#f6f7f9;">
    <tr><td style="padding:0 8px 16px 8px;">
      <div style="display:flex;align-items:center;gap:10px;">
        ${logoUrl ? `<img src="${escapeAttr(logoUrl)}" alt="${escapeAttr(brandName)}" style="height:36px;width:auto;border:0;display:block;" />` : ''}
        <div style="font-weight:700;font-size:16px;color:#111;">${escapeHtml(brandName)}</div>
      </div>
    </td></tr>

    <tr><td style="padding:0 8px 16px 8px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff;border:1px solid #e7e7e9;border-radius:14px;">
        <tr><td style="padding:20px;">
          <div style="font-size:20px;font-weight:700;color:#111;margin:0 0 6px 0;">Receipt • ${escapeHtml(brandName)}</div>
          <div style="color:#68707a;font-size:14px;margin:0 0 10px 0;">Paid ${escapeHtml(createdStr)}</div>
          <div style="font-size:28px;font-weight:800;margin:10px 0;">${money(total, currency)}</div>
          <div style="margin-top:14px;">
            ${viewOrderUrl ? `<a href="${escapeAttr(viewOrderUrl)}" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;padding:10px 14px;border-radius:999px;font-weight:600;">View receipt</a>` : ''}
            ${receiptUrl ? `<a href="${escapeAttr(receiptUrl)}" style="display:inline-block;margin-left:8px;color:#0ea5e9;text-decoration:none;padding:10px 14px;border-radius:999px;border:1px solid #0ea5e9;font-weight:600;">Card receipt</a>` : ''}
          </div>
        </td></tr>
      </table>
    </td></tr>

    <tr><td style="padding:0 8px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff;border:1px solid #e7e7e9;border-radius:14px;">
        <tr><td style="padding:18px 20px;">
          <div style="font-size:16px;font-weight:700;margin:0 0 8px 0;">Order ${escapeHtml(orderNumber)}</div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            <thead>
              <tr>
                <th align="left" style="text-align:left;color:#68707a;font-size:13px;padding:6px 0;">Student</th>
                <th align="left" style="text-align:left;color:#68707a;font-size:13px;padding:6px 0;">Items</th>
                <th align="right" style="text-align:right;color:#68707a;font-size:13px;padding:6px 0;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${studentRows || `<tr><td colspan="3" style="padding:8px 0;color:#68707a;">Thank you for your order.</td></tr>`}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding-top:10px;color:#68707a;">Payment ${pm ? `• ${escapeHtml(pm)}` : ''}</td>
                <td align="right" style="padding-top:10px;font-weight:800;">${money(total, currency)}</td>
              </tr>
            </tfoot>
          </table>
          <div style="margin-top:12px;color:#68707a;font-size:13px;">
            A copy has been sent to ${escapeHtml(parentEmail || 'your email')}.
          </div>
        </td></tr>
      </table>
    </td></tr>

    <tr><td style="padding:12px 8px 0 8px;color:#68707a;font-size:12px;">
      Questions? Reply to this email and we’ll help.
    </td></tr>
  </table>
</body></html>`;

  const text = [
    `${brandName} — Receipt ${orderNumber}`,
    `Paid: ${createdStr}`,
    `Total: ${money(total, currency)}`,
    parentEmail ? `Email: ${parentEmail}` : '',
    students && students.length ? '\nItems:' : '',
    ...(students || []).map((s) => {
      const line = s.packageLine || [s.pkg, s.addons].filter(Boolean).join(', ');
      const amt = s.amount != null ? money(s.amount, currency) : '';
      return `• ${s.name}${line ? ` — ${line}` : ''}${amt ? ` — ${amt}` : ''}`;
    }),
    viewOrderUrl ? `\nView receipt: ${viewOrderUrl}` : '',
    receiptUrl ? `Card receipt: ${receiptUrl}` : '',
  ].filter(Boolean).join('\n');

  return { subject, html, text };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }

function absoluteLogoUrl(event) {
  // Build absolute base from request (works for both *.netlify.app and custom domain)
  const protoHost = event.headers['x-forwarded-proto'] && event.headers['x-forwarded-host']
    ? `${event.headers['x-forwarded-proto']}://${event.headers['x-forwarded-host']}`
    : (`https://${event.headers.host}`);
  return `${protoHost}/2020Logo_black.png`;
}

function successPageUrl(event, sessionId) {
  const protoHost = event.headers['x-forwarded-proto'] && event.headers['x-forwarded-host']
    ? `${event.headers['x-forwarded-proto']}://${event.headers['x-forwarded-host']}`
    : (`https://${event.headers.host}`);
  return `${protoHost}/success.html?session_id=${encodeURIComponent(sessionId || '')}`;
}
