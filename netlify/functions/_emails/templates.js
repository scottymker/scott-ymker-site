// netlify/functions/_emails/templates.js (CommonJS)

const escapeHtml = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const money = (cents = 0, currency = "usd") =>
  (Number(cents) / 100).toLocaleString(undefined, {
    style: "currency",
    currency: (currency || "USD").toUpperCase(),
  });

/** Full package breakdowns */
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
  E1: ["2 × 5x7","2 × 3.5x5","12 × wallets"],
};

/** Add-on display names */
const ADDON_NAMES = {
  F:"8x10 Print",
  G:"2 × 5x7 Prints",
  H:"4 × 3.5x5 Prints",
  I:"24 Wallets",
  J:"8 Wallets",
  K:"16 Mini Wallets",
  L:"Retouching",
  M:"8x10 Class Composite",
  N:"Digital File",
};

/**
 * modernReceipt2
 * @param {Object} payload
 * {
 *   businessName, logoUrl, orderNumber, paidAtISO, totalCents, currency,
 *   receiptUrl, parentEmail,
 *   students: [{ name, pkg, addons:[], amountCents }],
 *   contact: { email, phone, site }
 * }
 */
function modernReceipt2(payload = {}) {
  const {
    businessName = "Scott Ymker Photography",
    logoUrl = "",
    orderNumber = "",
    paidAtISO = new Date().toISOString(),
    totalCents = 0,
    currency = "usd",
    receiptUrl = "#",
    parentEmail = "",
    students = [],
    contact = {
      email: "scott@scottymkerphotos.com",
      phone: "605-550-0828",
      site: "https://scottymkerphotos.com",
    },
  } = payload;

  const paidPretty = new Date(paidAtISO).toLocaleString();

  const studentRows = students
    .map((s) => {
      const pkg = (s.pkg || "").toUpperCase();
      const pkgLines = PACKAGE_BREAKDOWN[pkg] || [];
      const addonLines = (s.addons || []).map((code) => {
        const nm = ADDON_NAMES[code] || `Add-on ${code}`;
        return nm;
      });

      // Build bullet list
      const bullets = []
        .concat(pkg ? [`Package ${escapeHtml(pkg)}`] : [])
        .concat(pkgLines)
        .concat(addonLines.length ? addonLines : []);

      const bulletsHtml = bullets
        .map((b) => `<li>${escapeHtml(b)}</li>`)
        .join("");

      return `
        <tr>
          <td class="td-name">
            <div class="student-name">${escapeHtml(s.name || "Student")}</div>
            <ul class="bullets">${bulletsHtml}</ul>
          </td>
          <td class="td-items">${escapeHtml([s.pkg, ...(s.addons||[])].filter(Boolean).join(", ")) || "—"}</td>
          <td class="td-amt">${money(s.amountCents || 0, currency)}</td>
        </tr>
      `;
    })
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt • ${escapeHtml(businessName)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body{margin:0;padding:0;background:#0b0d10;color:#f6f7f9;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}
    a{color:#76c7ff}
    .container{max-width:640px;margin:0 auto;padding:24px}
    .card{background:#151a21;border:1px solid #253041;border-radius:16px;padding:20px}
    .brand{display:flex;align-items:center;gap:12px;font-weight:800;font-size:20px;margin-bottom:16px}
    .brand img{height:36px;width:auto}
    .pill{display:inline-block;background:#0d2a3f;border:1px solid #29455f;color:#c1e8ff;padding:3px 10px;border-radius:999px;font-weight:700}
    .total{font-size:36px;font-weight:800;margin:6px 0 10px}
    .muted{color:#b3bcc7}
    .btn{display:inline-block;background:#1b74ff;border-radius:999px;color:#fff;text-decoration:none;padding:12px 18px;font-weight:700}
    .table{width:100%;border-collapse:collapse;margin-top:8px}
    th,td{padding:10px;border-bottom:1px solid #253041;font-size:14px;vertical-align:top}
    th{color:#a8b3bf;text-align:left}
    .td-amt{text-align:right;white-space:nowrap}
    .td-items{width:110px}
    .student-name{font-weight:700}
    .bullets{margin:6px 0 0 18px;padding:0}
    .bullets li{margin:2px 0}
    .footer{color:#a8b3bf;font-size:13px;margin-top:14px}
    .grid{display:grid;grid-template-columns:1fr;gap:16px}
    @media (min-width:700px){.grid{grid-template-columns:1.1fr .9fr}}
  </style>
</head>
<body>
  <div class="container">
    <div class="brand">
      ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(businessName)}">` : ""}
      <div>${escapeHtml(businessName)}</div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="pill">Receipt • ${escapeHtml(businessName)}</div>
        <div class="total">${money(totalCents, currency)}</div>
        <div class="muted">Paid ${escapeHtml(paidPretty)}</div>
        <div style="margin-top:14px">
          <a class="btn" href="${escapeHtml(receiptUrl)}" target="_blank" rel="noopener">View receipt</a>
        </div>
      </div>

      <div class="card">
        <div class="pill" style="background:#0d392f;border-color:#285347;color:#bff3d9">Order ${escapeHtml(orderNumber)}</div>
        <table class="table" role="table" aria-label="Order items">
          <thead><tr><th>Student</th><th>Items</th><th class="td-amt">Amount</th></tr></thead>
          <tbody>
            ${studentRows || `<tr><td colspan="3" class="muted">No items.</td></tr>`}
          </tbody>
          <tfoot>
            <tr><td></td><td style="text-align:right;font-weight:700">Total</td><td class="td-amt" style="font-weight:800">${money(totalCents, currency)}</td></tr>
          </tfoot>
        </table>
        <div class="footer">
          A copy has been sent to ${escapeHtml(parentEmail || "your email")}.
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <div style="font-weight:700;margin-bottom:6px">Questions or changes?</div>
      <div class="footer">
        Reply to this email and we’ll help. <br>
        <strong>Email:</strong> <a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a><br>
        <strong>Phone:</strong> <a href="tel:+16055500828">${escapeHtml(contact.phone)}</a><br>
        <strong>Website:</strong> <a href="${escapeHtml(contact.site)}">${escapeHtml(contact.site)}</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = { modernReceipt2, PACKAGE_BREAKDOWN, ADDON_NAMES };
