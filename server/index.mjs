import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Route modules
import authRoutes from './routes/auth.mjs';
import eventRoutes from './routes/events.mjs';
import studentRoutes from './routes/students.mjs';
import orderRoutes from './routes/orders.mjs';
import imageRoutes from './routes/images.mjs';
import exportRoutes from './routes/export.mjs';
import analyticsRoutes from './routes/analytics.mjs';
import communicationsRoutes from './routes/communications.mjs';
import publicRoutes from './routes/public.mjs';
import dashboardRoutes from './routes/dashboard.mjs';
import qrPdfRoutes from './routes/qr-pdf.mjs';
import stripeRoutes from './routes/stripe-routes.mjs';
import contactRoutes from './routes/contact.mjs';
import compositeRoutes from './routes/composites.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(PROJECT_ROOT, 'uploads');

const PORT = parseInt(process.env.PORT || '3000', 10);

const app = express();

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (e.g., curl, mobile apps) in dev
      if (!origin) return cb(null, true);
      if (
        process.env.NODE_ENV !== 'production' ||
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(origin)
      ) {
        return cb(null, true);
      }
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

// ---------------------------------------------------------------------------
// Stripe webhook needs the RAW body for signature verification.
// Use express.raw() for that specific path, then express.json() for everything else.
// ---------------------------------------------------------------------------
app.use('/api/stripe/webhook', express.raw({ type: 'application/json', limit: '5mb' }));

// ---------------------------------------------------------------------------
// Standard middleware
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// ---------------------------------------------------------------------------
// Static file serving
// ---------------------------------------------------------------------------
// Serve uploaded images (previews/originals)
app.use('/uploads', express.static(UPLOAD_DIR, {
  maxAge: '1h',
  dotfiles: 'deny',
}));

// Serve front-end static files from project root
app.use(express.static(PROJECT_ROOT, {
  index: 'index.html',
  dotfiles: 'deny',
  // Don't cache HTML files so deploys are picked up immediately
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store');
    }
  },
}));

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------
app.use('/api/admin/dashboard',      dashboardRoutes);
app.use('/api/admin/auth',           authRoutes);
app.use('/api/admin/events',         eventRoutes);
app.use('/api/admin/students',       studentRoutes);
app.use('/api/admin/orders',         orderRoutes);
app.use('/api/admin/images',         imageRoutes);
app.use('/api/admin/export',         exportRoutes);
app.use('/api/admin/analytics',      analyticsRoutes);
app.use('/api/admin/events',         qrPdfRoutes);  // /api/admin/events/:id/qr-pdf
app.use('/api/admin/communications', communicationsRoutes);
app.use('/api/admin/composites',     compositeRoutes);
app.use('/api/public',               publicRoutes);
app.use('/api/stripe',               stripeRoutes);
app.use('/api/contact',              contactRoutes);

// ---------------------------------------------------------------------------
// SPA fallback — serve index.html for unknown paths that don't look like
// API requests or static assets (enables client-side routing if added later)
// ---------------------------------------------------------------------------
app.get('*', (req, res, next) => {
  // Let API misses return 404 JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  const indexFile = path.join(PROJECT_ROOT, 'index.html');
  res.sendFile(indexFile, (err) => {
    if (err) next(err);
  });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);

  // Multer file type / size errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large (max 50 MB)' });
  }
  if (err.message === 'Only image files are allowed') {
    return res.status(415).json({ error: err.message });
  }

  // CORS errors
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ error: err.message });
  }

  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : (err.message || 'Internal server error');

  return res.status(status).json({ error: message });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`  Project root : ${PROJECT_ROOT}`);
  console.log(`  Upload dir   : ${UPLOAD_DIR}`);
  console.log(`  NODE_ENV     : ${process.env.NODE_ENV || 'development'}`);
});

export default app;
