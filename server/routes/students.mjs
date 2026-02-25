import { Router } from 'express';
import { parse as parseCsv } from 'csv-parse/sync';
import { adminGuard } from '../middleware/admin-guard.mjs';
import { query } from '../db.mjs';
import { generateUniqueCode } from '../lib/generate-code.mjs';

const router = Router();
router.use(adminGuard);

// GET /api/admin/students?event_id=X
router.get('/', async (req, res) => {
  try {
    const { event_id } = req.query;

    let sql = `
      SELECT
        s.*,
        COUNT(i.id)::int AS image_count
      FROM students s
      LEFT JOIN images i ON i.student_id = s.id
    `;
    const params = [];

    if (event_id) {
      sql += ' WHERE s.event_id = $1';
      params.push(event_id);
    }

    sql += ' GROUP BY s.id ORDER BY s.last_name, s.first_name';

    const { rows } = await query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error('GET /students error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/admin/students
router.post('/', async (req, res) => {
  try {
    const {
      event_id, first_name, last_name,
      grade, teacher, code,
      parent_name, parent_email, parent_phone,
    } = req.body || {};

    if (!event_id || !first_name || !last_name) {
      return res.status(400).json({ error: 'event_id, first_name, and last_name are required' });
    }

    const studentCode = code
      ? code.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '')
      : await generateUniqueCode();

    if (studentCode.length !== 6) {
      return res.status(400).json({ error: 'code must be exactly 6 valid characters' });
    }

    const { rows } = await query(
      `INSERT INTO students
         (event_id, first_name, last_name, grade, teacher, code, parent_name, parent_email, parent_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [event_id, first_name, last_name, grade || null, teacher || null, studentCode,
       parent_name || null, parent_email || null, parent_phone || null]
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Student code already exists' });
    }
    console.error('POST /students error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/admin/students/import-csv
router.post('/import-csv', async (req, res) => {
  try {
    const { event_id, csv } = req.body || {};

    if (!event_id || !csv) {
      return res.status(400).json({ error: 'event_id and csv are required' });
    }

    let records;
    try {
      records = parseCsv(csv, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (parseErr) {
      return res.status(400).json({ error: 'Invalid CSV', detail: parseErr.message });
    }

    // Normalize column names (accept various casings)
    const normalize = (obj) => {
      const n = {};
      for (const [k, v] of Object.entries(obj)) {
        n[k.toLowerCase().trim()] = v;
      }
      return n;
    };

    const created = [];
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const row = normalize(records[i]);
      const first_name = row.first || row.first_name || '';
      const last_name = row.last || row.last_name || '';

      if (!first_name || !last_name) {
        errors.push({ row: i + 1, error: 'Missing first or last name' });
        continue;
      }

      const rawCode = row.code || '';
      const studentCode = rawCode
        ? rawCode.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '')
        : await generateUniqueCode();

      try {
        const { rows } = await query(
          `INSERT INTO students
             (event_id, first_name, last_name, grade, teacher, code)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [event_id, first_name, last_name,
           row.grade || null, row.teacher || null, studentCode]
        );
        created.push(rows[0]);
      } catch (rowErr) {
        errors.push({ row: i + 1, error: rowErr.code === '23505' ? 'Duplicate code' : rowErr.message });
      }
    }

    return res.status(207).json({
      created: created.length,
      errors: errors.length,
      students: created,
      error_details: errors,
    });
  } catch (err) {
    console.error('POST /students/import-csv error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/students/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const studentResult = await query('SELECT * FROM students WHERE id = $1', [id]);
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const imagesResult = await query(
      'SELECT * FROM images WHERE student_id = $1 ORDER BY sort_order, created_at',
      [id]
    );

    return res.json({ ...studentResult.rows[0], images: imagesResult.rows });
  } catch (err) {
    console.error('GET /students/:id error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// PUT /api/admin/students/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ['first_name', 'last_name', 'grade', 'teacher', 'school',
                     'parent_name', 'parent_email', 'parent_phone',
                     'order_status', 'prepay_pkg', 'prepay_addons', 'prepay_bg'];

    const fields = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(req.body[key]);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(id);
    const { rows } = await query(
      `UPDATE students SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error('PUT /students/:id error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /api/admin/students/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      'DELETE FROM students WHERE id = $1 RETURNING id',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    return res.json({ deleted: true, id: rows[0].id });
  } catch (err) {
    console.error('DELETE /students/:id error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

export default router;
