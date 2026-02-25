import { Router } from 'express';
import { adminGuard } from '../middleware/admin-guard.mjs';
import { query } from '../db.mjs';

const router = Router();
router.use(adminGuard);

// GET /api/admin/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    // Event counts
    const eventsResult = await query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active
       FROM events`
    );

    // Order summary
    const ordersResult = await query(
      `SELECT
         COUNT(*)::int AS total,
         COALESCE(SUM(amount), 0)::int AS revenue
       FROM orders
       WHERE status != 'refunded'`
    );

    // Recent orders (last 10)
    const recentResult = await query(
      `SELECT
         o.order_number AS id,
         o.amount,
         o.status,
         o.created_at,
         e.name AS event_name,
         (SELECT string_agg(oi.student_name, ', ')
          FROM order_items oi WHERE oi.order_id = o.id) AS student_name
       FROM orders o
       LEFT JOIN events e ON e.id = o.event_id
       ORDER BY o.created_at DESC
       LIMIT 10`
    );

    const events = eventsResult.rows[0];
    const orders = ordersResult.rows[0];

    return res.json({
      totalEvents: events.total,
      activeEvents: events.active,
      totalOrders: orders.total,
      revenue: orders.revenue,
      recentOrders: recentResult.rows.map(r => ({
        id: r.id,
        student_name: r.student_name || '---',
        event_name: r.event_name || '---',
        amount_cents: r.amount,
        status: r.status,
        created_at: r.created_at,
      })),
    });
  } catch (err) {
    console.error('GET /dashboard/stats error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

export default router;
