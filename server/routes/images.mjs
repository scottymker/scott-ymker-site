import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import sharp from 'sharp';
import { adminGuard } from '../middleware/admin-guard.mjs';
import { query } from '../db.mjs';

const router = Router();
router.use(adminGuard);

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Multer: store files in memory so we can process with sharp before saving
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|tiff)$/.test(file.mimetype);
    cb(ok ? null : new Error('Only image files are allowed'), ok);
  },
});

async function processAndSave(fileBuffer, mimeType, studentCode, originalName) {
  const safeName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');

  const origDir = path.join(UPLOAD_DIR, 'originals', studentCode);
  const prevDir = path.join(UPLOAD_DIR, 'previews', studentCode);
  await fs.mkdir(origDir, { recursive: true });
  await fs.mkdir(prevDir, { recursive: true });

  const origPath = path.join(origDir, safeName);
  const prevPath = path.join(prevDir, safeName);

  // Save original as-is
  await fs.writeFile(origPath, fileBuffer);

  // Create watermarked preview (max 1600px, with text watermark)
  const meta = await sharp(fileBuffer).metadata();
  const w = meta.width || 1600;
  const h = meta.height || 1600;
  const maxDim = 1600;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const outW = Math.round(w * scale);
  const outH = Math.round(h * scale);

  // Build SVG watermark overlay
  const wmText = 'PROOF - Scott Ymker Photography';
  const svgWatermark = `
    <svg width="${outW}" height="${outH}" xmlns="http://www.w3.org/2000/svg">
      <text
        x="50%" y="55%"
        font-family="Arial, sans-serif"
        font-size="${Math.round(outW / 12)}px"
        font-weight="bold"
        fill="rgba(255,255,255,0.45)"
        text-anchor="middle"
        dominant-baseline="middle"
        transform="rotate(-30, ${outW / 2}, ${outH / 2})"
      >${wmText}</text>
    </svg>`;

  await sharp(fileBuffer)
    .resize(outW, outH, { fit: 'inside', withoutEnlargement: true })
    .composite([{ input: Buffer.from(svgWatermark), gravity: 'center' }])
    .jpeg({ quality: 85 })
    .toFile(prevPath);

  return { origPath, prevPath, safeName };
}

// POST /api/admin/images/upload
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { student_id, sort_order = 0 } = req.body || {};
    if (!student_id) {
      return res.status(400).json({ error: 'student_id is required' });
    }

    const studentResult = await query(
      'SELECT id, code FROM students WHERE id = $1',
      [student_id]
    );
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const { code } = studentResult.rows[0];

    const { origPath, prevPath, safeName } = await processAndSave(
      req.file.buffer,
      req.file.mimetype,
      code,
      req.file.originalname
    );

    const { rows } = await query(
      `INSERT INTO images (student_id, filename, original_path, preview_path, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [student_id, safeName, origPath, prevPath, parseInt(sort_order, 10)]
    );

    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /images/upload error:', err);
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// POST /api/admin/images/upload-batch
router.post('/upload-batch', upload.array('images', 50), async (req, res) => {
  try {
    const { student_id } = req.body || {};
    if (!student_id) {
      return res.status(400).json({ error: 'student_id is required' });
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No image files provided' });
    }

    const studentResult = await query(
      'SELECT id, code FROM students WHERE id = $1',
      [student_id]
    );
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const { code } = studentResult.rows[0];

    const saved = [];
    const errors = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      try {
        const { origPath, prevPath, safeName } = await processAndSave(
          file.buffer,
          file.mimetype,
          code,
          file.originalname
        );
        const { rows } = await query(
          `INSERT INTO images (student_id, filename, original_path, preview_path, sort_order)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [student_id, safeName, origPath, prevPath, i]
        );
        saved.push(rows[0]);
      } catch (fileErr) {
        errors.push({ filename: file.originalname, error: fileErr.message });
      }
    }

    return res.status(207).json({ saved: saved.length, errors: errors.length, images: saved, error_details: errors });
  } catch (err) {
    console.error('POST /images/upload-batch error:', err);
    return res.status(500).json({ error: 'Batch upload failed' });
  }
});

// GET /api/admin/images?event_id=X  — list images for an event (joins through students)
router.get('/', async (req, res) => {
  try {
    const { event_id, student_id } = req.query;

    let sql = `
      SELECT
        i.*,
        s.first_name || ' ' || s.last_name AS student_name,
        s.code AS student_code,
        '/api/admin/images/' || i.id AS url,
        '/api/admin/images/' || i.id AS thumbnail_url
      FROM images i
      JOIN students s ON s.id = i.student_id
    `;
    const params = [];

    if (event_id) {
      params.push(event_id);
      sql += ` WHERE s.event_id = $${params.length}`;
    }
    if (student_id) {
      params.push(student_id);
      sql += params.length > 1 ? ` AND s.id = $${params.length}` : ` WHERE s.id = $${params.length}`;
    }

    sql += ' ORDER BY s.last_name, s.first_name, i.sort_order, i.created_at';

    const { rows } = await query(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error('GET /images error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/admin/images/:id  — serve the preview file
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type = 'preview' } = req.query; // ?type=original for original

    const { rows } = await query('SELECT * FROM images WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const img = rows[0];
    const filePath = type === 'original' ? img.original_path : img.preview_path;

    if (!filePath || !existsSync(filePath)) {
      return res.status(404).json({ error: 'Image file not found on disk' });
    }

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.sendFile(path.resolve(filePath));
  } catch (err) {
    console.error('GET /images/:id error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/images/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await query(
      'DELETE FROM images WHERE id = $1 RETURNING *',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const img = rows[0];

    // Best-effort file deletion
    for (const p of [img.original_path, img.preview_path]) {
      if (p) {
        fs.unlink(p).catch(() => {});
      }
    }

    return res.json({ deleted: true, id: img.id });
  } catch (err) {
    console.error('DELETE /images/:id error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
});

export default router;
