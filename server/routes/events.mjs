import { Router } from 'express';
import { adminGuard } from '../middleware/admin-guard.mjs';
import { query } from '../db.mjs';

const router = Router();
router.use(adminGuard);

// GET /api/admin/events
router.get('/', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT
        e.id, e.name, e.school, e.date, e.status, e.model, e.settings, e.created_at,
        COUNT(s.id)::int AS student_count
      FROM events e
      LEFT JOIN students s ON s.event_id = e.id
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `);
    return res.json(rows);
  } catch (err) {
    console.error('GET /events error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/admin/events
router.post('/', async (req, res) => {
  try {
    const { name, school, date, status = 'draft', model = 'prepay', settings = {} } = req.body || {};

    if (!name || !school) {
      return res.status(400).json({ error: 'name and school are required' });
    }

    const { rows } = await query(
      `INSERT INTO events (name, school, date, status, model, settings)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, school, date || null, status, model, JSON.stringify(settings)]
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /events error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/admin/events/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const eventResult = await query(
      `SELECT
        e.*,
        COUNT(DISTINCT s.id)::int AS student_count,
        COUNT(DISTINCT o.id)::int AS order_count,
        COALESCE(SUM(o.amount), 0)::int AS total_revenue
       FROM events e
       LEFT JOIN students s ON s.event_id = e.id
       LEFT JOIN orders o ON o.event_id = e.id AND o.status != 'refunded'
       WHERE e.id = $1
       GROUP BY e.id`,
      [id]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    return res.json(eventResult.rows[0]);
  } catch (err) {
    console.error('GET /events/:id error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// PUT /api/admin/events/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, school, date, status, model, settings } = req.body || {};

    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined)     { fields.push(`name = $${idx++}`);     values.push(name); }
    if (school !== undefined)   { fields.push(`school = $${idx++}`);   values.push(school); }
    if (date !== undefined)     { fields.push(`date = $${idx++}`);     values.push(date || null); }
    if (status !== undefined)   { fields.push(`status = $${idx++}`);   values.push(status); }
    if (model !== undefined)    { fields.push(`model = $${idx++}`);    values.push(model); }
    if (settings !== undefined) { fields.push(`settings = $${idx++}`); values.push(JSON.stringify(settings)); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const { rows } = await query(
      `UPDATE events SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error('PUT /events/:id error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// DELETE /api/admin/events/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(
      'DELETE FROM events WHERE id = $1 RETURNING id',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    return res.json({ deleted: true, id: rows[0].id });
  } catch (err) {
    console.error('DELETE /events/:id error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

export default router;
