import { Router } from 'express';
import { sendEmail } from '../lib/send-email.mjs';

const router = Router();

/**
 * POST /api/contact/submit
 * Accepts { name, email, phone, topic, message } (+ bot-field for honeypot)
 * Sends a notification email to the configured CONTACT_EMAIL address.
 * No authentication required.
 */
router.post('/submit', async (req, res) => {
  try {
    const { name, email, phone, topic, message } = req.body;
    const botField = req.body['bot-field'] || req.body['botField'] || '';

    // Honeypot check — bots fill hidden fields; humans leave them blank
    if (botField) {
      // Return 200 to not tip off bots, but do nothing
      return res.json({ success: true });
    }

    // Basic validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required.' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const to = process.env.CONTACT_EMAIL || 'scott@scottymkerphotos.com';
    const subject = `Contact form: ${(topic || 'General question').trim()} — ${name.trim()}`;

    const html = `
<p><strong>New contact form submission</strong></p>
<table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;font-size:15px;">
  <tr><td style="color:#666;white-space:nowrap;padding-right:16px;"><strong>Name</strong></td><td>${esc(name)}</td></tr>
  <tr><td style="color:#666;white-space:nowrap;padding-right:16px;"><strong>Email</strong></td><td><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
  <tr><td style="color:#666;white-space:nowrap;padding-right:16px;"><strong>Phone</strong></td><td>${esc(phone) || '&mdash;'}</td></tr>
  <tr><td style="color:#666;white-space:nowrap;padding-right:16px;"><strong>Topic</strong></td><td>${esc(topic) || 'General question'}</td></tr>
</table>
<hr style="margin:16px 0;border:none;border-top:1px solid #e5e7eb;">
<p style="white-space:pre-wrap;font-family:sans-serif;font-size:15px;">${esc(message)}</p>
<hr style="margin:16px 0;border:none;border-top:1px solid #e5e7eb;">
<p style="color:#999;font-size:12px;">Sent via the Scott Ymker Photography contact form.</p>
`;

    const text = [
      'New contact form submission',
      '',
      `Name:    ${name}`,
      `Email:   ${email}`,
      `Phone:   ${phone || '—'}`,
      `Topic:   ${topic || 'General question'}`,
      '',
      message,
    ].join('\n');

    await sendEmail({ to, subject, html, text });

    return res.json({ success: true });
  } catch (err) {
    console.error('Contact form error:', err);
    return res.status(500).json({ error: 'Failed to send message. Please try again or email us directly.' });
  }
});

/** Minimal HTML escaping for template literals */
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default router;
