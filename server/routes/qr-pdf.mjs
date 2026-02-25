import { Router } from 'express';
import { adminGuard } from '../middleware/admin-guard.mjs';
import { query } from '../db.mjs';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

const router = Router();
router.use(adminGuard);

// GET /api/admin/events/:eventId/qr-pdf
router.get('/:eventId/qr-pdf', async (req, res) => {
  try {
    const { eventId } = req.params;

    const eventResult = await query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const event = eventResult.rows[0];

    const { rows: students } = await query(
      `SELECT code, first_name, last_name, grade, teacher
       FROM students WHERE event_id = $1
       ORDER BY last_name, first_name`,
      [eventId]
    );

    if (students.length === 0) {
      return res.status(400).json({ error: 'No students in this event' });
    }

    const siteUrl = process.env.SITE_URL || 'http://192.168.1.63';

    // Build PDF in memory
    const doc = new PDFDocument({ size: 'LETTER', margin: 36 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    const cols = 2;
    const rowsPerPage = 5;
    const gap = 16;
    const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const pageH = doc.page.height - doc.page.margins.top - doc.page.margins.bottom;
    const cardW = (pageW - gap) / cols;
    const cardH = (pageH - gap * (rowsPerPage - 1)) / rowsPerPage;

    for (let i = 0; i < students.length; i++) {
      if (i > 0 && i % (cols * rowsPerPage) === 0) doc.addPage();

      const c = i % cols;
      const r = Math.floor((i % (cols * rowsPerPage)) / cols);
      const x = doc.page.margins.left + c * (cardW + gap);
      const y = doc.page.margins.top + r * (cardH + gap);
      const student = students[i];

      // Card border
      doc.roundedRect(x, y, cardW, cardH, 8).stroke();

      // Brand + event name
      doc.fontSize(14).font('Helvetica-Bold').text('Scott Ymker Photography', x + 16, y + 14);
      doc.fontSize(12).font('Helvetica').text(event.name, x + 16, y + 32);

      // Access code (large)
      doc.fontSize(22).font('Helvetica-Bold').text(student.code, x + 16, y + 60);

      // Student info
      const lastInitial = student.last_name ? student.last_name[0] + '.' : '';
      const info = `${student.first_name} ${lastInitial}  •  ${student.teacher || ''}  •  ${student.grade || ''}`;
      doc.fontSize(12).font('Helvetica').text(info, x + 16, y + 90);

      // QR code
      const url = `${siteUrl}/access.html?code=${student.code}`;
      const qrBuffer = await QRCode.toBuffer(url, { margin: 1, width: 140 });
      doc.image(qrBuffer, x + cardW - 140 - 16, y + 20, { width: 120 });

      // Scan instruction
      doc.fontSize(10).font('Helvetica').text('Scan to view gallery', x + cardW - 140 - 16, y + 20 + 125);

      // URL at bottom
      doc.fontSize(9).font('Helvetica').fillColor('#666').text(url, x + 16, y + cardH - 22, { width: cardW - 32 });
      doc.fillColor('#000');
    }

    doc.end();
    await new Promise((resolve) => doc.on('end', resolve));

    const pdfBuffer = Buffer.concat(chunks);
    const filename = `${event.name.replace(/\s+/g, '_')}_QR_Cards.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('GET /events/:eventId/qr-pdf error:', err);
    return res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

export default router;
