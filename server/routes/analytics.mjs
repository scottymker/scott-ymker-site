import { Router } from 'express';
import { adminGuard } from '../middleware/admin-guard.mjs';
import { query } from '../db.mjs';

const router = Router();
router.use(adminGuard);

// GET /api/admin/analytics?event_id=X
router.get('/', async (req, res) => {
  try {
    const { event_id } = req.query;
    if (!event_id) {
      return res.status(400).json({ error: 'event_id is required' });
    }

    // Revenue and order summary
    const summaryResult = await query(
      `SELECT
         COUNT(*)::int                          AS order_count,
         COALESCE(SUM(amount), 0)::int          AS total_revenue,
         COALESCE(AVG(amount), 0)::numeric      AS avg_order_value
       FROM orders
       WHERE event_id = $1 AND status != 'refunded'`,
      [event_id]
    );

    // Total students in event
    const studentCountResult = await query(
      `SELECT COUNT(*)::int AS total_students
       FROM students WHERE event_id = $1`,
      [event_id]
    );

    // Students with orders
    const convertedResult = await query(
      `SELECT COUNT(*)::int AS converted_students
       FROM students
       WHERE event_id = $1 AND order_status IN ('paid', 'fulfilled')`,
      [event_id]
    );

    const totalStudents = studentCountResult.rows[0].total_students;
    const convertedStudents = convertedResult.rows[0].converted_students;
    const conversionRate = totalStudents > 0
      ? Math.round((convertedStudents / totalStudents) * 10000) / 100  // percentage with 2 decimals
      : 0;

    // Package distribution
    const packageResult = await query(
      `SELECT
         oi.package,
         COUNT(*)::int AS count
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.event_id = $1 AND o.status != 'refunded' AND oi.package IS NOT NULL
       GROUP BY oi.package
       ORDER BY count DESC`,
      [event_id]
    );

    // Orders by day (last 90 days)
    const byDayResult = await query(
      `SELECT
         DATE(created_at)::text   AS date,
         COUNT(*)::int            AS order_count,
         SUM(amount)::int         AS revenue
       FROM orders
       WHERE event_id = $1
         AND status != 'refunded'
         AND created_at > NOW() - INTERVAL '90 days'
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [event_id]
    );

    const summary = summaryResult.rows[0];

    return res.json({
      order_count: summary.order_count,
      total_revenue: summary.total_revenue,
      avg_order_value: Math.round(Number(summary.avg_order_value)),
      total_students: totalStudents,
      converted_students: convertedStudents,
      conversion_rate: conversionRate,
      package_distribution: packageResult.rows,
      orders_by_day: byDayResult.rows,
    });
  } catch (err) {
    console.error('GET /analytics error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

export default router;
