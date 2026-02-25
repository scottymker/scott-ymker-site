/**
 * Thin wrapper around the Resend API.
 * Uses RESEND_API_KEY and EMAIL_FROM env vars.
 */

const RESEND_API = 'https://api.resend.com/emails';

/**
 * Send a transactional email via Resend.
 *
 * @param {object} opts
 * @param {string|string[]} opts.to     - Recipient email address(es)
 * @param {string}          opts.subject
 * @param {string}          opts.html   - HTML body
 * @param {string}          [opts.text] - Optional plain-text fallback
 * @param {string}          [opts.from] - Override EMAIL_FROM
 * @returns {Promise<{ id: string }>}
 */
export async function sendEmail({ to, subject, html, text, from }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not set');

  const sender = from || process.env.EMAIL_FROM || 'noreply@scottymker.com';

  const body = {
    from: sender,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  };
  if (text) body.text = text;

  const resp = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json();

  if (!resp.ok) {
    const msg = data?.message || data?.name || JSON.stringify(data);
    throw new Error(`Resend error ${resp.status}: ${msg}`);
  }

  return data; // { id: 're_...' }
}
