import { verifyJWT } from '../lib/jwt.mjs';

/**
 * Express middleware that enforces JWT authentication for admin routes.
 * Reads the `admin_token` httpOnly cookie, verifies it, and sets req.admin.
 */
export function adminGuard(req, res, next) {
  const token = req.cookies?.admin_token;

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET env var is not set');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  try {
    const payload = verifyJWT(token, secret);
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session', detail: err.message });
  }
}
