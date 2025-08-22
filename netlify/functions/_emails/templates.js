// netlify/functions/_emails/templates.js

/**
 * Generates a clean, mobile-friendly receipt email (HTML + text).
 * Exported via CommonJS to work with `require()` inside Netlify Functions.
 */
function modernReceipt({
  brandName,
  logoUrl = "",
  orderNumber,
  created,
  total = 0,
  currency = "usd",
  parentEmail = "",
  receiptUrl = "",
  viewOrderUrl = "",
  students = [],
  pmBrand = "",
  pmLast4 = ""
}) {
  const when = new Date((created || Date.now() / 1000) * 1000)
    .toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  const currencyFmt = (c) =>
    (Number(c || 0) / 100).toLocaleString(undefined, {
      style: "currency",
      currency: (currency || "USD").toUpperCase(),
    });

  const rows = (students || [])
    .map((s) => {
      const amt = s.amount != null ? currencyFmt(s.amount) : "";
      const meta = [s.teacher, s.grade, s.bg].filter(Boolean).join(" • ");
      const pkg = s.packageLine || "";
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eef2f7">
            <div style="font-weight:600">${s.name || "Student"}</div>
            <div style="color:#6b7280;font-size:13px">${meta || "&nbsp;"}</div>
            <div style="color:#111827;font-size:13px">${pkg}</div>
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #eef2f7;text-align:right">${amt}</td>
        </tr>`;
    })
    .join("");

  const card = pmBrand ? pmBrand.toUpperCase() : "";
  const masked = pmLast4 ? `•••• •••• •••• ${pmLast4}` : "";

  const subject = `${brandName} receipt • ${orderNumber}`;

  const html = `<!doctype html><html><body style="margin:0;background:#f6f7f9">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:24px 0">
  <tr><td align="center">
    <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;padding:0 16px">
      <tr><td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px">
          <tr>
            <td style="display:flex;align-items:center;gap:10px">
              ${logoUrl ? `<img src="${logoUrl}" alt="${brandName}" style="height:36px;width:auto">` : ""}
              <div style="font-weight:700">${brandName}</div>
            </td>
          </tr>
          <tr><td style="height:12px"></td></tr>
          <tr><td style="font-size:22px;font-weight:700">${currencyFmt(total)}</td></tr>
          <tr><td style="color:#6b7280">Paid ${when}</td></tr>
          <tr><td style="height:12px"></td></tr>
          <tr>
            <td style="color:#6b7280;font-size:14px">
              <div><strong>Receipt #</strong> ${orderNumber}</div>
              ${card || masked ? `<div><strong>Payment</strong> ${card} ${masked}</div>` : ""}
            </td>
          </tr>
        </table>
        <div style="height:14px"></div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px">
          <tr><td style="font-weight:600;padding:6px 8px 12px">Items</td><td></td></tr>
          ${rows || `<tr><td style="padding:8px 12px;color:#6b7280">No line items</td><td></td></tr>`}
          <tr>
            <td style="padding:12px 12px 0;font-weight:700">Total</td>
            <td style="padding:12px 12px 0;text-align:right;font-weight:700">${currencyFmt(total)}</td>
          </tr>
        </table>
        <div style="height:12px"></div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px">
          <tr><td style="font-weight:600;padding-bottom:6px">Need help?</td></tr>
          <tr><td style="color:#6b7280;font-size:14px">
            ${receiptUrl ? `<a href="${receiptUrl}">Download card receipt</a> &nbsp;•&nbsp;` : ""}
            ${viewOrderUrl ? `<a href="${viewOrderUrl}">View order</a> &nbsp;•&nbsp;` : ""}
            Questions? Reply to this email.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  const text = [
    `${brandName} receipt — ${orderNumber}`,
    `Paid ${when}`,
    `Total: ${currencyFmt(total)}`,
    "",
    ...(students || []).map((s) => `- ${s.name}: ${s.packageLine || ""}`).filter(Boolean),
    receiptUrl ? `\nCard receipt: ${receiptUrl}` : "",
    viewOrderUrl ? `Order: ${viewOrderUrl}` : "",
  ].join("\n");

  return { subject, html, text };
}

module.exports = { modernReceipt };
