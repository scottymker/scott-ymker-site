import { Router } from 'express';
import { signJWT, verifyJWT } from '../lib/jwt.mjs';
import { query } from '../db.mjs';

const router = Router();

const SESSION_COOKIE = 'sesh';
const SESSION_TTL_SECONDS = 3600; // 1 hour

function getSessionCookie(req) {
  return req.cookies?.[SESSION_COOKIE] || null;
}

// POST /api/public/verify-code
router.post('/verify-code', async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) {
      return res.status(400).json({ error: 'code is required' });
    }

    const safe = String(code).toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '');
    if (safe.length !== 6) {
      return res.status(400).json({ error: 'Invalid code format' });
    }

    const { rows } = await query(
      `SELECT s.id, s.code, s.first_name, s.last_name, s.grade, s.teacher,
              s.event_id, e.status AS event_status, e.name AS event_name
       FROM students s
       JOIN events e ON e.id = s.event_id
       WHERE s.code = $1`,
      [safe]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Code not found' });
    }

    const student = rows[0];

    if (!['active', 'second-sale'].includes(student.event_status)) {
      return res.status(403).json({ error: 'This event is not currently active' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const token = signJWT(
      { c: safe, e: student.event_id, s: `${student.first_name} ${student.last_name}` },
      secret,
      SESSION_TTL_SECONDS
    );

    const secure = process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS !== 'false';
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_SECONDS * 1000,
      secure,
    });

    return res.json({ success: true, redirect: '/gallery.html' });
  } catch (err) {
    console.error('POST /public/verify-code error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/public/lookup-student?code=X
router.get('/lookup-student', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ error: 'code is required' });
    }

    const safe = String(code).toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '');
    if (safe.length !== 6) {
      return res.status(400).json({ error: 'Invalid code format' });
    }

    const { rows } = await query(
      `SELECT s.first_name, s.last_name, s.grade, s.teacher, e.name AS event_name, e.school
       FROM students s
       JOIN events e ON e.id = s.event_id
       WHERE s.code = $1 AND e.status IN ('active', 'second-sale', 'draft')`,
      [safe]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error('GET /public/lookup-student error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/public/gallery  — requires session cookie
router.get('/gallery', async (req, res) => {
  try {
    const token = getSessionCookie(req);
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    let payload;
    try {
      payload = verifyJWT(token, secret);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const code = String(payload.c || '').toUpperCase();
    if (!code) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const studentResult = await query(
      `SELECT s.*, e.name AS event_name, e.school, e.settings AS event_settings
       FROM students s
       JOIN events e ON e.id = s.event_id
       WHERE s.code = $1`,
      [code]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = studentResult.rows[0];

    const imagesResult = await query(
      `SELECT id, filename, preview_path, sort_order, created_at
       FROM images
       WHERE student_id = $1
       ORDER BY sort_order, created_at`,
      [student.id]
    );

    // Build public preview URLs
    const images = imagesResult.rows.map((img) => ({
      id: img.id,
      filename: img.filename,
      previewUrl: `/uploads/previews/${code}/${img.filename}`,
      sort_order: img.sort_order,
    }));

    // Determine order status
    const orderResult = await query(
      `SELECT id, order_number, status, amount, created_at
       FROM orders
       WHERE id = $1`,
      [student.order_id]
    );
    const order = orderResult.rows[0] || null;

    return res.json({
      code,
      eventName: student.event_name,
      school: student.school,
      studentLabel: `${student.first_name} ${student.last_name}`,
      grade: student.grade,
      teacher: student.teacher,
      images,
      order,
      orderStatus: student.order_status,
      prepayPkg: student.prepay_pkg,
      prepayAddons: student.prepay_addons,
      prepayBg: student.prepay_bg,
    });
  } catch (err) {
    console.error('GET /public/gallery error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
