import { Router } from 'express';
import { adminGuard } from '../middleware/admin-guard.mjs';
import { query } from '../db.mjs';
import { buildComposite } from '../lib/composite-builder.mjs';
import path from 'node:path';
import fs from 'node:fs/promises';

const router = Router();
router.use(adminGuard);

// POST /api/admin/composites/generate
// Body: { event_id, teacher?, grade?, school_name?, year?, bg_color? }
router.post('/generate', async (req, res) => {
  try {
    const {
      event_id,
      teacher,
      grade,
      school_name,
      year,
      bg_color = '#ffffff',
    } = req.body || {};

    if (!event_id) {
      return res.status(400).json({ error: 'event_id is required' });
    }

    // Get event info
    const eventResult = await query('SELECT * FROM events WHERE id = $1', [event_id]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const event = eventResult.rows[0];

    // Build student filter
    let studentSql = `
      SELECT s.id, s.first_name, s.last_name, s.grade, s.teacher,
             (SELECT i.original_path FROM images i WHERE i.student_id = s.id ORDER BY i.sort_order, i.created_at LIMIT 1) AS image_path
      FROM students s
      WHERE s.event_id = $1
    `;
    const params = [event_id];

    if (teacher) {
      params.push(teacher);
      studentSql += ` AND s.teacher = $${params.length}`;
    }
    if (grade) {
      params.push(grade);
      studentSql += ` AND s.grade = $${params.length}`;
    }

    studentSql += ' ORDER BY s.last_name, s.first_name';

    const { rows: students } = await query(studentSql, params);

    if (students.length === 0) {
      return res.status(400).json({ error: 'No students found matching the filter' });
    }

    // Build composite
    const pdfBuffer = await buildComposite({
      students: students.map(s => ({
        first_name: s.first_name,
        last_name: s.last_name,
        imagePath: s.image_path || null,
      })),
      schoolName: school_name || event.school || '',
      teacher: teacher || '',
      grade: grade || '',
      year: year || new Date().getFullYear().toString(),
      bgColor: bg_color,
    });

    // Send PDF
    const filename = [
      event.school || 'School',
      teacher || '',
      grade || '',
      'Composite',
    ].filter(Boolean).join('_').replace(/\s+/g, '_') + '.pdf';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('POST /composites/generate error:', err);
    return res.status(500).json({ error: err.message || 'Composite generation failed' });
  }
});

// GET /api/admin/composites/classes?event_id=X
// Returns distinct teacher/grade combos for building the UI
router.get('/classes', async (req, res) => {
  try {
    const { event_id } = req.query;
    if (!event_id) {
      return res.status(400).json({ error: 'event_id is required' });
    }

    const { rows } = await query(`
      SELECT
        teacher,
        grade,
        COUNT(*)::int AS student_count
      FROM students
      WHERE event_id = $1
        AND teacher IS NOT NULL
        AND teacher != ''
      GROUP BY teacher, grade
      ORDER BY teacher, grade
    `, [event_id]);

    return res.json(rows);
  } catch (err) {
    console.error('GET /composites/classes error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

export default router;
