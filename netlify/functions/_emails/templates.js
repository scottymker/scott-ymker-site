// netlify/functions/_emails/templates.js
'use strict';

// simple USD formatter (uses the currency passed in)
const money = (cents = 0, currency = 'usd') =>
  (Number(cents) / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: String(currency || 'USD').toUpperCase(),
  });

/**
 * modernReceipt(props) -> { subject, html, text }
 *
 * Expected props from the webhook:
 *  brandName, logoUrl, orderNumber, created, total, currency,
 *  parentEmail, receiptUrl, viewOrderUrl,
 *  students:[{name, packageLine, amount}], pmBrand, pmLast4
 */
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

  // Build student rows (name / items / amount)
  const studentRows =
    students && students.length
      ? students
          .map((s) => {
            const line = s.packageLine || [s.pkg, s.addons].filter(Boolean).join(', ');
            const amt = s.amount != null ? money(s.amount, currency) : '';
            return `
          <tr>
            <td style="padding:8px 0;font-weight:600;">${escapeHtml(s.name || '')}</td>
            <td style="padding:8px 0;color:#555;">${escapeHtml(line || '')}</td>
            <td style="padding:8px 0;text-align:right;white-space:nowrap;">${amt}</td>
          </tr>`;
          })
          .join('')
      : '';

  const pm = [pmBrand ? pmBrand.toUpperCase() : '', pmLast4 ? `•••• ${pmLast4}` : '']
    .filter(Boolean)
    .join(' · ');

  // --- HTML email (safe inline styles) ---
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;background:#f6f7f9;padding:24px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#f6f7f9;">
    <tr>
      <td style="padding:0 8px 16px 8px;text-align:left;">
        <div style="display:flex;align-items:center;gap:10px;">
          ${logoUrl ? `<img src="${escapeAttr(logoUrl)}" alt="${escapeAttr(brandName)}" style="height:36px;width:auto;border:0;display:block;" />` : ''}
          <div style="font-weight:700;font-size:16px;color:#111;">${escapeHtml(brandName)}</div>
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:0 8px 16px 8px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff;border:1px solid #e7e7e9;border-radius:14px;">
          <tr>
            <td style="padding:20px;">
              <div style="font-size:20px;font-weight:700;color:#111;margin:0 0 6px 0;">Receipt • ${escapeHtml(brandName)}</div>
              <div style="color:#68707a;font-size:14px;margin:0 0 10px 0;">Paid ${escapeHtml(createdStr)}</div>
              <div style="font-size:28px;font-weight:800;margin:10px 0;">${money(total, currency)}</div>

              <div style="margin-top:14px;">
                ${viewOrderUrl ? `<a href="${escapeAttr(viewOrderUrl)}" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;padding:10px 14px;border-radius:999px;font-weight:600;">View receipt</a>` : ''}
                ${receiptUrl ? `<a href="${escapeAttr(receiptUrl)}" style="display:inline-block;margin-left:8px;color:#0ea5e9;text-decoration:none;padding:10px 14px;border-radius:999px;border:1px solid #0ea5e9;font-weight:600;">Card receipt</a>` : ''}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:0 8px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff;border:1px solid #e7e7e9;border-radius:14px;">
          <tr>
            <td style="padding:18px 20px;">
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
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:12px 8px 0 8px;color:#68707a;font-size:12px;">
        Questions? Reply to this email and we’ll help.
      </td>
    </tr>
  </table>
</body>
</html>`;

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
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, html, text };
}

// small escaping helpers
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

module.exports = { modernReceipt };
