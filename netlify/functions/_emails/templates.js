// netlify/functions/_emails/templates.js
const money = (cents, cur="usd") =>
  (Number(cents || 0) / 100).toLocaleString(undefined, { style:"currency", currency: cur.toUpperCase() });

const shortDate = (unix) => {
  const d = new Date(unix * 1000);
  return d.toLocaleDateString(undefined, { year:"numeric", month:"short", day:"numeric" });
};

/**
 * Modern “receipt card” email (logo + amount + links + itemized table)
 * Inputs:
 *  - brandName, logoUrl, orderNumber, created
 *  - total, currency, parentEmail
 *  - students: [{ name, packageLine, teacher, grade, bg, amount }]
 *  - receiptUrl, viewOrderUrl
 *  - pmBrand, pmLast4  (optional; e.g., "VISA", "4242")
 */
exports.modernReceipt = function modernReceipt(opts = {}) {
  const {
    brandName = "Scott Ymker Photography",
    logoUrl = "",
    orderNumber = "",
    created = Math.floor(Date.now()/1000),
    total = 0,
    currency = "usd",
    parentEmail = "",
    receiptUrl = "",
    viewOrderUrl = "",
    students = [],
    pmBrand = "",
    pmLast4 = "",
  } = opts;

  const headerLogo = logoUrl ? `<img src="${logoUrl}" alt="${brandName}" style="height:36px">` : "";
  const paidLine = `Paid ${shortDate(created)}`;

  const payMethod = pmBrand && pmLast4
    ? `${pmBrand.toUpperCase()} • • • • ${pmLast4}`
    : "—";

  const studentsRows = students.map(s => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #eef2f7">
        <div style="font-weight:600">${s.name}</div>
        <div style="color:#6b7280;font-size:13px;line-height:1.35">
          ${s.packageLine ? `Package: ${s.packageLine}` : ""}
          ${s.teacher || s.grade || s.bg ? `<br>Teacher: ${s.teacher || "—"} • Grade: ${s.grade || "—"} • Background: ${s.bg || "—"}` : ""}
        </div>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #eef2f7;text-align:right;white-space:nowrap">
        ${s.amount != null ? money(s.amount, currency) : ""}
      </td>
    </tr>
  `).join("");

  const html = `
  <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f6f7f9;color:#111;padding:24px">
    <table role="presentation" width="100%" style="max-width:720px;margin:0 auto">
      <tr><td>

        <!-- Top receipt card -->
        <table role="presentation" width="100%" style="background:#fff;border:1px solid #e8ebef;border-radius:18px;box-shadow:0 1px 3px rgba(0,0,0,.04)">
          <tr>
            <td style="padding:18px 20px;border-bottom:1px solid #e8ebef;display:flex;gap:10px;align-items:center">
              ${headerLogo}
              <span style="font-weight:700">${brandName}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 20px 8px">
              <div style="font-size:34px;font-weight:800">${money(total, currency)}</div>
              <div style="color:#6b7280;margin-top:2px">${paidLine}</div>
              <hr style="border:none;border-top:1px solid #e8ebef;margin:16px 0">
              <div style="display:flex;gap:14px;flex-wrap:wrap">
                ${receiptUrl ? `<a href="${receiptUrl}" style="text-decoration:none;color:#0b77c5">↓ Download receipt</a>` : ""}
                ${viewOrderUrl ? `<a href="${viewOrderUrl}" style="text-decoration:none;color:#0b77c5">View order</a>` : ""}
              </div>

              <table role="presentation" style="margin-top:14px;width:100%">
                <tr>
                  <td style="color:#6b7280">Receipt number</td>
                  <td style="text-align:right">${orderNumber || "—"}</td>
                </tr>
                <tr>
                  <td style="color:#6b7280">Payment method</td>
                  <td style="text-align:right">${payMethod}</td>
                </tr>
                <tr>
                  <td style="color:#6b7280">Email</td>
                  <td style="text-align:right">${parentEmail || "—"}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Items card -->
        <table role="presentation" width="100%" style="background:#fff;border:1px solid #e8ebef;border-radius:18px;box-shadow:0 1px 3px rgba(0,0,0,.04);margin-top:16px">
          <tr>
            <td style="padding:16px 20px 8px;font-weight:700">Receipt #${orderNumber || "—"}</td>
          </tr>
          <tr>
            <td style="padding:0 20px 20px">
              <table role="presentation" width="100%" style="border-collapse:collapse">
                <thead>
                  <tr>
                    <th align="left" style="color:#6b7280;font-size:12px;text-transform:uppercase;padding:0 12px 8px">Description</th>
                    <th align="right" style="color:#6b7280;font-size:12px;text-transform:uppercase;padding-bottom:8px">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${studentsRows || `<tr><td style="padding:10px 0;color:#6b7280">No items</td><td></td></tr>`}
                </tbody>
                <tfoot>
                  <tr>
                    <td style="padding:10px 12px;text-transform:uppercase;color:#6b7280">Total</td>
                    <td style="padding:10px 0;text-align:right;font-weight:700">${money(total, currency)}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 12px;color:#6b7280">Amount paid</td>
                    <td style="padding:6px 0;text-align:right;font-weight:700">${money(total, currency)}</td>
                  </tr>
                </tfoot>
              </table>
              <div style="margin-top:16px;color:#6b7280;font-size:13px">
                Questions? Contact us at <a href="mailto:scott@scottymkerphotos.com">scott@scottymkerphotos.com</a>
              </div>
            </td>
          </tr>
        </table>

      </td></tr>
    </table>
  </div>`;

  const text =
`${brandName}
${money(total, currency)} — ${paidLine}
Order #: ${orderNumber}
${parentEmail ? `Email: ${parentEmail}\n` : ""}${pmBrand && pmLast4 ? `Payment method: ${pmBrand.toUpperCase()} •••• ${pmLast4}\n` : ""}

Items:
${students.map(s => `- ${s.name} — ${s.packageLine}${s.teacher||s.grade||s.bg ? ` (${s.teacher||"—"}/${s.grade||"—"}/${s.bg||"—"})` : ""}${s.amount!=null ? ` — ${money(s.amount, currency)}` : ""}`).join("\n")}

Total: ${money(total, currency)}
${receiptUrl ? `Receipt: ${receiptUrl}\n` : ""}${viewOrderUrl ? `View order: ${viewOrderUrl}\n` : ""}`;

  return { subject: `${brandName} • Receipt ${orderNumber}`, html, text };
};
