import { Router } from 'express';
import { adminGuard } from '../middleware/admin-guard.mjs';
import { query } from '../db.mjs';
import { generateOrderNumber } from '../lib/order-number.mjs';

const router = Router();
router.use(adminGuard);

// GET /api/admin/orders?event_id=X
router.get('/', async (req, res) => {
  try {
    const { event_id } = req.query;

    let sql = `
      SELECT
        o.*,
        e.name AS event_name,
        json_agg(
          json_build_object(
            'id', oi.id,
            'student_id', oi.student_id,
            'student_code', oi.student_code,
            'student_name', oi.student_name,
            'package', oi.package,
            'addons', oi.addons,
            'background', oi.background
          )
        ) FILTER (WHERE oi.id IS NOT NULL) AS items
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN events e ON e.id = o.event_id
    `;
    const params = [];

    if (event_id) {
      sql += ' WHERE o.event_id = $1';
      params.push(event_id);
    }

    sql += ' GROUP BY o.id, e.name ORDER BY o.created_at DESC';

    const { rows } = await query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error('GET /orders error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/admin/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const orderResult = await query('SELECT * FROM orders WHERE id = $1', [id]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const itemsResult = await query(
      'SELECT * FROM order_items WHERE order_id = $1',
      [id]
    );

    return res.json({ ...orderResult.rows[0], items: itemsResult.rows });
  } catch (err) {
    console.error('GET /orders/:id error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// PUT /api/admin/orders/bulk-status  (must come before /:id)
router.put('/bulk-status', async (req, res) => {
  try {
    const { order_ids, status } = req.body || {};

    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return res.status(400).json({ error: 'order_ids array is required' });
    }
    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const validStatuses = ['paid', 'submitted_to_lab', 'fulfilled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const extraFields = status === 'fulfilled' ? ', fulfilled_at = NOW()' : '';
    const placeholders = order_ids.map((_, i) => `$${i + 2}`).join(', ');

    const { rowCount } = await query(
      `UPDATE orders SET status = $1${extraFields} WHERE id IN (${placeholders})`,
      [status, ...order_ids]
    );

    return res.json({ updated: rowCount });
  } catch (err) {
    console.error('PUT /orders/bulk-status error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// PUT /api/admin/orders/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const validStatuses = ['paid', 'submitted_to_lab', 'fulfilled', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status` });
    }

    const extraFields = status === 'fulfilled' ? ', fulfilled_at = NOW()' : '';
    const { rows } = await query(
      `UPDATE orders SET status = $1${extraFields} WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error('PUT /orders/:id error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/admin/orders  (manual order entry)
router.post('/', async (req, res) => {
  try {
    const {
      student_id,
      event_id,
      package: pkg,
      addons = [],
      background,
      payment_method = 'cash',
      amount,
      parent_name,
      parent_email,
      parent_phone,
    } = req.body || {};

    if (!student_id || amount == null) {
      return res.status(400).json({ error: 'student_id and amount are required' });
    }

    // Resolve event_id from student if not provided
    let resolvedEventId = event_id;
    let studentCode = null;
    let studentName = null;

    const studentResult = await query(
      'SELECT id, event_id, code, first_name, last_name FROM students WHERE id = $1',
      [student_id]
    );
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const student = studentResult.rows[0];
    resolvedEventId = resolvedEventId || student.event_id;
    studentCode = student.code;
    studentName = `${student.first_name} ${student.last_name}`;

    const orderNumber = generateOrderNumber();

    const orderResult = await query(
      `INSERT INTO orders
         (order_number, status, amount, parent_name, parent_email, parent_phone,
          event_id, source, payment_method)
       VALUES ($1, 'paid', $2, $3, $4, $5, $6, 'manual', $7)
       RETURNING *`,
      [orderNumber, amount, parent_name || null, parent_email || null,
       parent_phone || null, resolvedEventId, payment_method]
    );
    const order = orderResult.rows[0];

    await query(
      `INSERT INTO order_items
         (order_id, student_id, student_code, student_name, package, addons, background)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [order.id, student_id, studentCode, studentName, pkg || null,
       addons || [], background || null]
    );

    // Update student order status
    await query(
      `UPDATE students SET order_status = 'paid', order_id = $1 WHERE id = $2`,
      [order.id, student_id]
    );

    return res.status(201).json(order);
  } catch (err) {
    console.error('POST /orders error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

export default router;
