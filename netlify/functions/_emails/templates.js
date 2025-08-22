// CommonJS module: exports.renderReceipt()

const PACKAGE_BREAKDOWN = {
  A:  ["1 × 8x10 Class Composite","2 × 8x10","2 × 5x7","8 × wallets","16 × mini wallets"],
  A1: ["1 × 8x10 Class Composite","2 × 8x10","2 × 5x7","8 × wallets","16 × mini wallets","1 × Digital File"],
  B:  ["1 × 8x10 Class Composite","1 × 8x10","2 × 5x7","16 × wallets"],
  B1: ["1 × 8x10 Class Composite","1 × 8x10","4 × 5x7","16 × wallets"],
  C:  ["1 × 8x10 Class Composite","1 × 8x10","2 × 3.5x5","4 × wallets","16 × mini wallets"],
  C1: ["1 × 8x10 Class Composite","1 × 8x10","2 × 3.5x5","2 × 5x7","4 × wallets","16 × mini wallets"],
  D:  ["1 × 8x10 Class Composite","2 × 5x7","8 × wallets"],
  D1: ["1 × 8x10 Class Composite","2 × 5x7","8 × wallets","16 × mini wallets"],
  E:  ["2 × 5x7","2 × 3.5x5","4 × wallets"],
  E1: ["2 × 5x7","2 × 3.5x5","12 × wallets"]
};

function currency(cents, code = 'USD') {
  return (Number(cents || 0) / 100).toLocaleString(undefined, { style: 'currency', currency: code.toUpperCase() });
}

function styles() {
  return `
  <style>
    body{margin:0;background:#0b0f14;color:#e8eef5;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}
    .wrap{max-width:640px;margin:0 auto;padding:24px}
    .brand{display:flex;align-items:center;gap:10px;margin-bottom:12px}
    .brand img{height:28px;width:auto;border-radius:6px}
    .brand .name{font-weight:700;letter-spacing:.2px}
    .card{background:#0f141b;border:1px solid #1d2633;border-radius:16px;padding:20px;margin-top:14px}
    .muted{color:#a7b0bc}
    .h1{font-size:20px;font-weight:700;margin:0 0 8px}
    .h2{font-size:14px;font-weight:700;margin:0 0 10px}
    .big{font-size:32px;font-weight:800}
    .btn{display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;padding:10px 14px;border-radius:999px;font-weight:700}
    .grid{display:grid;grid-template-columns:1.2fr .8fr;gap:14px}
    @media (max-width:680px){.grid{grid-template-columns:1fr}}
    table{width:100%;border-collapse:collapse}
    th,td{padding:8px;border-bottom:1px solid #1d2633;text-align:left;vertical-align:top}
    th{color:#9fb0c4;font-size:12px}
    .pill{display:inline-block;background:#0c1a25;color:#7bd4ff;border:1px solid #15354b;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:700}
    ul{margin:6px 0 0 18px;padding:0}
    li{margin:3px 0}
    .foot{font-size:12px;color:#96a4b3;margin-top:10px}
    a{color:#7cd3ff}
  </style>`;
}

function studentBlock(s, currencyCode) {
  const pkg = (s.pkg || '').toUpperCase();
  const addons = (s.addons || []).filter(Boolean);
  const codes = [pkg, ...addons].filter(Boolean).join(', ') || '—';
  const lines = (pkg && PACKAGE_BREAKDOWN[pkg]) ? PACKAGE_BREAKDOWN[pkg] : null;

  return `
  <div class="card" style="padding:14px">
    <div class="h2" style="margin-bottom:6px">${s.name || 'Student'}</div>
    <div><span class="pill">Items</span> &nbsp; ${codes}</div>
    ${lines ? `
      <div style="margin-top:8px" class="muted">Package breakdown</div>
      <ul>${lines.map(li=>`<li>${li}</li>`).join('')}</ul>
    ` : ''}
    ${s.teacher || s.grade ? `
      <div style="margin-top:8px">
        <span class="muted">Teacher/Grade:</span> ${[s.teacher, s.grade].filter(Boolean).join(' / ')}
      </div>` : ''}
    ${s.bg ? `<div class="muted" style="margin-top:6px">Background: ${s.bg}</div>` : ''}
  </div>`;
}

function renderReceipt(opts) {
  const {
    brandName = 'Scott Ymker Photography',
    logoUrl,
    amount_cents = 0,
    currency_code = 'USD',
    paid_at_str = '',
    order_number = '',
    receipt_url,
    parent_email,
    students = [],
    contact = { email: 'scott@scottymkerphotos.com', phone: '605-550-0828', site: 'scottymkerphotos.com' }
  } = opts || {};

  return `<!doctype html><html><head><meta charset="utf-8">${styles()}</head>
  <body>
    <div class="wrap">
      <div class="brand">
        ${logoUrl ? `<img src="${logoUrl}" alt="${brandName}">` : ''}
        <div class="name">${brandName}</div>
      </div>

      <div class="card">
        <div class="h1">Receipt • ${brandName}</div>
        <div class="big">${currency(amount_cents, currency_code)}</div>
        ${paid_at_str ? `<div class="muted" style="margin-top:4px">Paid ${paid_at_str}</div>` : ''}
        ${receipt_url ? `<div style="margin-top:12px"><a class="btn" href="${receipt_url}">View receipt</a></div>` : ''}
        <div style="margin-top:12px" class="muted">Order <strong>${order_number || '—'}</strong></div>
        ${parent_email ? `<div class="muted">A copy was sent to ${parent_email}</div>` : ''}
      </div>

      <div class="grid">
        <div class="card">
          <div class="h2">Students & packages</div>
          ${students.map(s => studentBlock(s, currency_code)).join('')}
        </div>

        <div class="card">
          <div class="h2">Details</div>
          <table>
            <tr><th>Order #</th><td>${order_number || '—'}</td></tr>
            <tr><th>Email</th><td>${parent_email || '—'}</td></tr>
            <tr><th>Total Paid</th><td>${currency(amount_cents, currency_code)}</td></tr>
            <tr><th>Status</th><td>PAID</td></tr>
          </table>
          <div class="foot">
            Questions? Reply to this email or contact us:<br>
            <strong>Email:</strong> <a href="mailto:${contact.email}">${contact.email}</a><br>
            <strong>Phone:</strong> <a href="tel:${contact.phone.replace(/[^0-9+]/g,'')}">${contact.phone}</a><br>
            <strong>Website:</strong> <a href="https://${contact.site}">${contact.site}</a>
          </div>
        </div>
      </div>
    </div>
  </body></html>`;
}

module.exports = { renderReceipt, PACKAGE_BREAKDOWN };
