import { Router } from 'express';
import { adminGuard } from '../middleware/admin-guard.mjs';
import { query } from '../db.mjs';

const router = Router();
router.use(adminGuard);

/**
 * Fetch students with order info for an event.
 * Returns empty array if event_id is missing.
 */
async function getStudentsForExport(event_id) {
  if (!event_id) return [];

  const { rows } = await query(
    `SELECT
       s.code, s.first_name, s.last_name, s.grade, s.teacher, s.school,
       s.parent_name, s.parent_email, s.parent_phone,
       s.order_status, s.prepay_pkg, s.prepay_addons, s.prepay_bg,
       o.order_number, o.amount, o.created_at AS order_date,
       oi.package, oi.addons, oi.background
     FROM students s
     LEFT JOIN orders o ON o.id = s.order_id
     LEFT JOIN order_items oi ON oi.order_id = o.id AND oi.student_id = s.id
     WHERE s.event_id = $1
     ORDER BY s.last_name, s.first_name`,
    [event_id]
  );
  return rows;
}

function escCsv(val) {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowToCsv(cols) {
  return cols.map(escCsv).join(',');
}

// GET /api/admin/export/hh-csv?event_id=X
// H&H Color Lab compatible CSV
router.get('/hh-csv', async (req, res) => {
  try {
    const { event_id } = req.query;
    if (!event_id) return res.status(400).json({ error: 'event_id is required' });

    const students = await getStudentsForExport(event_id);

    const header = rowToCsv([
      'OrderNumber', 'LastName', 'FirstName', 'Grade', 'Teacher',
      'Package', 'Addons', 'Background', 'ParentName', 'ParentEmail',
      'Amount', 'OrderDate', 'Code',
    ]);

    const lines = students.map((s) =>
      rowToCsv([
        s.order_number || '',
        s.last_name,
        s.first_name,
        s.grade || '',
        s.teacher || '',
        s.package || s.prepay_pkg || '',
        Array.isArray(s.addons) ? s.addons.join(';') : (s.prepay_addons || []).join(';'),
        s.background || s.prepay_bg || '',
        s.parent_name || '',
        s.parent_email || '',
        s.amount != null ? (s.amount / 100).toFixed(2) : '',
        s.order_date ? new Date(s.order_date).toISOString().slice(0, 10) : '',
        s.code,
      ])
    );

    const csv = [header, ...lines].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="hh-export-${event_id}.csv"`);
    return res.send(csv);
  } catch (err) {
    console.error('GET /export/hh-csv error:', err);
    return res.status(500).json({ error: 'Export failed' });
  }
});

// GET /api/admin/export/pspa?event_id=X
// PSPA index.txt format: LastName,FirstName,Grade,Teacher,Code
router.get('/pspa', async (req, res) => {
  try {
    const { event_id } = req.query;
    if (!event_id) return res.status(400).json({ error: 'event_id is required' });

    const students = await getStudentsForExport(event_id);

    const lines = students.map((s) =>
      [s.last_name, s.first_name, s.grade || '', s.teacher || '', s.code].join(',')
    );

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="pspa-index-${event_id}.txt"`);
    return res.send(lines.join('\r\n'));
  } catch (err) {
    console.error('GET /export/pspa error:', err);
    return res.status(500).json({ error: 'Export failed' });
  }
});

// GET /api/admin/export/pixnub?event_id=X
// Pixnub SPA CSV: Filename,LastName,FirstName,Grade,Teacher,Package,Background
router.get('/pixnub', async (req, res) => {
  try {
    const { event_id } = req.query;
    if (!event_id) return res.status(400).json({ error: 'event_id is required' });

    const students = await getStudentsForExport(event_id);

    const header = rowToCsv(['Filename', 'LastName', 'FirstName', 'Grade', 'Teacher', 'Package', 'Background', 'Code']);

    const lines = students.map((s) => {
      const pkg = s.package || s.prepay_pkg || '';
      const bg = s.background || s.prepay_bg || '';
      // Pixnub expects filename = student code
      return rowToCsv([s.code, s.last_name, s.first_name, s.grade || '', s.teacher || '', pkg, bg, s.code]);
    });

    const csv = [header, ...lines].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="pixnub-spa-${event_id}.csv"`);
    return res.send(csv);
  } catch (err) {
    console.error('GET /export/pixnub error:', err);
    return res.status(500).json({ error: 'Export failed' });
  }
});

export default router;
