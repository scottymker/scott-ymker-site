import { Router } from 'express';
import { adminGuard } from '../middleware/admin-guard.mjs';
import { query } from '../db.mjs';
import { sendEmail } from '../lib/send-email.mjs';

const router = Router();
router.use(adminGuard);

// POST /api/admin/communications/gallery-emails
// Send "your gallery is ready" email to all parents in an event
router.post('/gallery-emails', async (req, res) => {
  try {
    const { event_id, subject, message } = req.body || {};
    if (!event_id) {
      return res.status(400).json({ error: 'event_id is required' });
    }

    // Get students who have images and a parent email, haven't been emailed yet
    const { rows: students } = await query(
      `SELECT s.id, s.first_name, s.last_name, s.code, s.grade, s.teacher,
              s.parent_name, s.parent_email,
              e.name AS event_name, e.school
       FROM students s
       JOIN events e ON e.id = s.event_id
       WHERE s.event_id = $1
         AND s.parent_email IS NOT NULL
         AND s.gallery_email_sent_at IS NULL
         AND EXISTS (SELECT 1 FROM images i WHERE i.student_id = s.id)`,
      [event_id]
    );

    if (students.length === 0) {
      return res.json({ sent: 0, message: 'No eligible students found' });
    }

    const emailSubject = subject || 'Your School Photos Are Ready!';
    const sent = [];
    const errors = [];

    for (const student of students) {
      const galleryUrl = `${process.env.SITE_URL || 'https://scottymker.com'}/gallery.html`;
      const html = message
        ? `<p>${message}</p><p>Your access code: <strong>${student.code}</strong></p><p><a href="${galleryUrl}">View Gallery</a></p>`
        : `
          <h2>Hi ${student.parent_name || student.first_name}!</h2>
          <p>${student.first_name}'s school photos from <strong>${student.event_name}</strong> are ready to view.</p>
          <p>Use your access code <strong>${student.code}</strong> at:</p>
          <p><a href="${galleryUrl}">${galleryUrl}</a></p>
          <p>You can view the proofs and place your order online.</p>
          <p>Thank you,<br>Scott Ymker Photography</p>
        `;

      try {
        await sendEmail({ to: student.parent_email, subject: emailSubject, html });

        await query(
          'UPDATE students SET gallery_email_sent_at = NOW() WHERE id = $1',
          [student.id]
        );

        sent.push({ student_id: student.id, email: student.parent_email });
      } catch (emailErr) {
        errors.push({ student_id: student.id, email: student.parent_email, error: emailErr.message });
      }
    }

    return res.json({ sent: sent.length, errors: errors.length, sent_details: sent, error_details: errors });
  } catch (err) {
    console.error('POST /communications/gallery-emails error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/communications/reminders
// Send reminder to parents who have not yet placed an order
router.post('/reminders', async (req, res) => {
  try {
    const { event_id, subject, message } = req.body || {};
    if (!event_id) {
      return res.status(400).json({ error: 'event_id is required' });
    }

    const { rows: students } = await query(
      `SELECT s.id, s.first_name, s.last_name, s.code,
              s.parent_name, s.parent_email,
              e.name AS event_name
       FROM students s
       JOIN events e ON e.id = s.event_id
       WHERE s.event_id = $1
         AND s.parent_email IS NOT NULL
         AND s.order_status = 'none'
         AND s.gallery_email_sent_at IS NOT NULL`,
      [event_id]
    );

    if (students.length === 0) {
      return res.json({ sent: 0, message: 'No eligible students found' });
    }

    const emailSubject = subject || 'Reminder: Order Your School Photos';
    const sent = [];
    const errors = [];

    for (const student of students) {
      const galleryUrl = `${process.env.SITE_URL || 'https://scottymker.com'}/gallery.html`;
      const html = message
        ? `<p>${message}</p><p>Your access code: <strong>${student.code}</strong></p><p><a href="${galleryUrl}">Order Now</a></p>`
        : `
          <h2>Hi ${student.parent_name || student.first_name}!</h2>
          <p>This is a friendly reminder that ${student.first_name}'s photos from <strong>${student.event_name}</strong> are still available to order.</p>
          <p>Use your code <strong>${student.code}</strong> at <a href="${galleryUrl}">${galleryUrl}</a></p>
          <p>Thank you,<br>Scott Ymker Photography</p>
        `;

      try {
        await sendEmail({ to: student.parent_email, subject: emailSubject, html });

        await query(
          'UPDATE students SET reminder_email_sent_at = NOW() WHERE id = $1',
          [student.id]
        );

        sent.push({ student_id: student.id, email: student.parent_email });
      } catch (emailErr) {
        errors.push({ student_id: student.id, email: student.parent_email, error: emailErr.message });
      }
    }

    return res.json({ sent: sent.length, errors: errors.length, sent_details: sent, error_details: errors });
  } catch (err) {
    console.error('POST /communications/reminders error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/communications/history?event_id=X
router.get('/history', async (req, res) => {
  try {
    const { event_id } = req.query;
    if (!event_id) {
      return res.status(400).json({ error: 'event_id is required' });
    }

    const { rows } = await query(
      `SELECT
         s.id AS student_id,
         s.first_name, s.last_name, s.code, s.parent_email,
         s.gallery_email_sent_at,
         s.reminder_email_sent_at
       FROM students s
       WHERE s.event_id = $1
         AND (s.gallery_email_sent_at IS NOT NULL OR s.reminder_email_sent_at IS NOT NULL)
       ORDER BY GREATEST(
         COALESCE(s.gallery_email_sent_at, '1970-01-01'),
         COALESCE(s.reminder_email_sent_at, '1970-01-01')
       ) DESC`,
      [event_id]
    );

    return res.json(rows);
  } catch (err) {
    console.error('GET /communications/history error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

export default router;
