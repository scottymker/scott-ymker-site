'use strict';

// CommonJS email template utilities

const fmtMoney = (cents, currency = 'USD') =>
  (Number(cents || 0) / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  });

const fmtDateTime = (unixSeconds) => {
  try {
    const d = new Date((unixSeconds || Date.now() / 1000) * 1000);
    return d.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return '';
  }
};

function modernReceipt({
  brandName = 'Scott Ymker Photography',
  logoUrl = '',
  orderNumber = '',
  created = Math.floor(Date.now() / 1000),
  total = 0,
  currency = 'USD',
  parentEmail = '',
  receiptUrl = '',
  viewOrderUrl = '',
  students = [],
  pmBrand = '',
  pmLast4 = '',
}) {
  const paidAt = fmtDateTime(created);
  const totalFmt = fmtMoney(total, currency);

  const rows = (students || []).map((s) => {
    const line = s.packageLine || [s.pkg, s.addons].filter(Boolean).join(', ');
    const amt  = (s.amount != null) ? fmtMoney(s.amount, currency) : '';
    return `
      <tr>
        <td style="padding:8px 0;vertical-align:top">${s.name || ''}</td>
        <td style="padding:8px 0;vertical-align:top;color:#555">${line || ''}</td>
        <td style="padding:8px 0;vertical-align:top;text-align:right;white-space:nowrap">${amt}</td>
      </tr>`;
  }).join('');

  const subject = `Receipt • Order ${orderNumber}`;

  const html = `
  <div style="background:#f6f7f9;padding:24px 12px;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111">
    <div style="max-width:700px;margin:0 auto">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        ${logoUrl ? `<img src="${logoUrl}" alt="${brandName}" style="height:36px;width:auto" />` : ''}
        <div style="font-weight:700">${brandName}</div>
      </div>

      <div style="background:#fff;border:1px solid #e8ebef;border-radius:14px;padding:18px">
        <div style="font-size:18px;font-weight:700;margin-bottom:2px">Thank you for your purchase!</div>
        <div style="color:#68707a">Order <strong>${orderNumber}</strong> • Paid ${paidAt}</div>
        <hr style="border:none;border-top:1px solid #e8ebef;margin:14px 0" />

        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr>
              <th style="text-align:left;color:#68707a;font-size:13px;font-weight:600;padding-bottom:6px">Student</th>
              <th style="text-align:left;color:#68707a;font-size:13px;font-weight:600;padding-bottom:6px">Package / Add-ons</th>
              <th style="text-align:right;color:#68707a;font-size:13px;font-weight:600;padding-bottom:6px">Amount</th>
            </tr>
          </thead>
          <tbody>${rows || ''}</tbody>
          <tfoot>
            <tr>
              <td></td>
              <td style="padding-top:10px;color:#68707a;text-align:right">Total</td>
              <td style="padding-top:10px;text-align:right;font-weight:700">${totalFmt}</td>
            </tr>
          </tfoot>
        </table>

        <div style="margin-top:12px;color:#68707a">
          ${pmBrand ? `Payment method: ${pmBrand.toUpperCase()} •••• ${pmLast4 || ''}<br/>` : ''}
          Receipt sent to: ${parentEmail || 'your email'}
        </div>

        <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">
          ${viewOrderUrl ? `<a href="${viewOrderUrl}" style="text-decoration:none;background:#0ea5e9;color:#fff;padding:10px 14px;border-radius:999px;display:inline-block">View receipt</a>` : ''}
          ${receiptUrl ? `<a href="${receiptUrl}" style="text-decoration:none;border:1px solid #e8ebef;padding:10px 14px;border-radius:999px;display:inline-block;color:#111">Download Stripe receipt</a>` : ''}
        </div>
      </div>

      <div style="color:#68707a;font-size:13px;margin-top:10px">
        Questions? Reply to this email and we’ll help.
      </div>
    </div>
  </div>`.trim();

  const text = [
    `${brandName} — Receipt`,
    `Order: ${orderNumber}`,
    `Paid:  ${paidAt}`,
    '',
    ...((students || []).map((s) => {
      const line = s.packageLine || [s.pkg, s.addons].filter(Boolean).join(', ');
      const amt  = (s.amount != null) ? fmtMoney(s.amount, currency) : '';
      return `• ${s.name} — ${line}${amt ? ` — ${amt}` : ''}`;
    })),
    '',
    `Total: ${totalFmt}`,
    pmBrand ? `Payment method: ${pmBrand.toUpperCase()} •••• ${pmLast4}` : '',
    parentEmail ? `Receipt email: ${parentEmail}` : '',
    viewOrderUrl ? `View receipt: ${viewOrderUrl}` : '',
    receiptUrl ? `Stripe receipt: ${receiptUrl}` : '',
  ].filter(Boolean).join('\n');

  return { subject, html, text };
}

module.exports = { modernReceipt };
