import { Router } from 'express';
import { signJWT } from '../lib/jwt.mjs';
import { adminGuard } from '../middleware/admin-guard.mjs';

const router = Router();

const COOKIE_NAME = 'admin_token';
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  maxAge: 8 * 60 * 60 * 1000, // 8 hours in ms
  // secure: true should be set in production (behind HTTPS)
};

// POST /api/admin/auth/login
router.post('/login', (req, res) => {
  const { password } = req.body || {};

  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD env var is not set');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  if (password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET env var is not set');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  const token = signJWT({ role: 'admin' }, secret, 8 * 60 * 60);

  const secure = process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS !== 'false';
  res.cookie(COOKIE_NAME, token, { ...COOKIE_OPTS, secure });

  return res.json({ authenticated: true });
});

// POST /api/admin/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  return res.json({ authenticated: false });
});

// GET /api/admin/auth/check
router.get('/check', adminGuard, (req, res) => {
  return res.json({ authenticated: true, admin: req.admin });
});

export default router;
