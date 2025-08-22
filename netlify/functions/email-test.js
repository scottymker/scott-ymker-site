exports.handler = async (event) => {
  try {
    const to = new URLSearchParams(event.rawQuery || event.queryStringParameters).get("to");
    if (!to) return { statusCode: 400, body: "Add ?to=you@example.com" };

    const EMAIL_FROM = process.env.EMAIL_FROM || "orders@example.com";
    const REPLY_TO   = process.env.REPLY_TO || "";
    const RESEND_API_KEY   = process.env.RESEND_API_KEY;
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

    if (!RESEND_API_KEY && !SENDGRID_API_KEY) {
      return { statusCode: 500, body: "No RESEND_API_KEY or SENDGRID_API_KEY configured" };
    }

    const subject = "Test email from Netlify";
    const html = `<div style="font-family:system-ui">Hello 👋<br><br>This is a test from your Netlify function.<br>From: ${EMAIL_FROM}</div>`;
    const text = "Hello - this is a test from your Netlify function.";

    if (RESEND_API_KEY) {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html, text, reply_to: REPLY_TO || undefined })
      });
      const b = await resp.text();
      return { statusCode: resp.ok ? 200 : 500, body: b };
    }

    const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }], ...(REPLY_TO ? { reply_to: { email: REPLY_TO } } : {}) }],
        from: { email: EMAIL_FROM.replace(/.*<|>.*/g,"") || EMAIL_FROM, name: EMAIL_FROM.includes("<") ? EMAIL_FROM.split("<")[0].trim() : "Scott Ymker Photography" },
        subject, content: [{ type: "text/html", value: html }]
      })
    });
    return { statusCode: resp.ok ? 200 : 500, body: await resp.text() };
  } catch (e) {
    return { statusCode: 500, body: String(e) };
  }
};
