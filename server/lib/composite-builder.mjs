import sharp from 'sharp';
import PDFDocument from 'pdfkit';
import { existsSync } from 'node:fs';

/**
 * Generate a class composite image as a PDF buffer.
 *
 * @param {Object} opts
 * @param {Array}  opts.students   - [{ first_name, last_name, imagePath }]
 * @param {string} opts.schoolName - School name for header
 * @param {string} opts.teacher    - Teacher name
 * @param {string} opts.grade      - Grade
 * @param {string} opts.year       - Year text (e.g. "2025-2026")
 * @param {string} [opts.bgColor]  - Background hex color (default '#ffffff')
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function buildComposite(opts) {
  const {
    students = [],
    schoolName = '',
    teacher = '',
    grade = '',
    year = '',
    bgColor = '#ffffff',
  } = opts;

  // --- Layout constants (8x10 at 300 DPI) ---
  const PAGE_W = 2400;
  const PAGE_H = 3000;
  const MARGIN = 120;
  const HEADER_H = 300;
  const FOOTER_H = 120;
  const NAME_H = 60;

  const contentW = PAGE_W - MARGIN * 2;
  const contentH = PAGE_H - HEADER_H - FOOTER_H - MARGIN;

  const n = students.length;
  if (n === 0) throw new Error('No students provided');

  const cols = Math.ceil(Math.sqrt(n * 1.5));
  const rows = Math.ceil(n / cols);

  const cellW = Math.floor(contentW / cols);
  const cellH = Math.floor(contentH / rows);
  const thumbSize = Math.min(cellW - 20, cellH - NAME_H - 10);

  // --- Build SVG text overlay for header, names, footer ---
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let nameTexts = '';
  for (let i = 0; i < n; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = MARGIN + col * cellW + cellW / 2;
    const y = HEADER_H + row * cellH + thumbSize + NAME_H - 10;
    const s = students[i];
    const name = `${s.first_name} ${s.last_name}`;
    const maxChars = Math.floor(cellW / 16);
    const displayName = name.length > maxChars ? name.slice(0, maxChars - 1) + '\u2026' : name;
    nameTexts += `<text x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="28" fill="#1a1a2e" text-anchor="middle">${esc(displayName)}</text>\n`;
  }

  const subtitleParts = [grade, teacher].filter(Boolean).join(' \u2014 ');

  const textSvg = `<svg width="${PAGE_W}" height="${PAGE_H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${PAGE_W}" height="${PAGE_H}" fill="${esc(bgColor)}"/>
    <text x="${PAGE_W / 2}" y="${MARGIN + 80}" font-family="Arial,Helvetica,sans-serif" font-size="72" font-weight="bold" fill="#1a1a2e" text-anchor="middle">${esc(schoolName)}</text>
    <text x="${PAGE_W / 2}" y="${MARGIN + 160}" font-family="Arial,Helvetica,sans-serif" font-size="48" fill="#1a1a2e" text-anchor="middle">${esc(subtitleParts)}</text>
    <text x="${PAGE_W / 2}" y="${MARGIN + 220}" font-family="Arial,Helvetica,sans-serif" font-size="40" fill="#6b7280" text-anchor="middle">${esc(year)}</text>
    ${nameTexts}
    <text x="${PAGE_W / 2}" y="${PAGE_H - FOOTER_H / 2}" font-family="Arial,Helvetica,sans-serif" font-size="28" fill="#9ca3af" text-anchor="middle">Scott Ymker Photography</text>
  </svg>`;

  // --- Create base image from SVG ---
  const baseBuffer = await sharp(Buffer.from(textSvg))
    .png()
    .toBuffer();

  // --- Prepare headshot composites ---
  const compositeInputs = [];

  for (let i = 0; i < n; i++) {
    const s = students[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = MARGIN + col * cellW + Math.floor((cellW - thumbSize) / 2);
    const y = HEADER_H + row * cellH;

    let thumbBuffer;
    if (s.imagePath && existsSync(s.imagePath)) {
      try {
        thumbBuffer = await sharp(s.imagePath)
          .resize(thumbSize, thumbSize, { fit: 'cover', position: 'top' })
          .png()
          .toBuffer();
      } catch {
        thumbBuffer = createPlaceholderSvg(thumbSize, s.first_name, s.last_name);
      }
    } else {
      thumbBuffer = createPlaceholderSvg(thumbSize, s.first_name, s.last_name);
    }

    compositeInputs.push({
      input: thumbBuffer,
      left: x,
      top: y,
    });
  }

  const compositeImage = await sharp(baseBuffer)
    .composite(compositeInputs)
    .png()
    .toBuffer();

  // --- Generate PDF ---
  const ptW = PAGE_W / (300 / 72); // 576 pt
  const ptH = PAGE_H / (300 / 72); // 720 pt

  const doc = new PDFDocument({ size: [ptW, ptH], margin: 0 });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  doc.image(compositeImage, 0, 0, { width: ptW, height: ptH });
  doc.end();

  await new Promise((resolve) => doc.on('end', resolve));
  return Buffer.concat(chunks);
}

/**
 * Create a placeholder SVG buffer for students without a photo.
 */
function createPlaceholderSvg(size, firstName, lastName) {
  const initials = ((firstName?.[0] || '') + (lastName?.[0] || '')).toUpperCase();
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="#e5e7eb"/>
    <text x="${size / 2}" y="${size / 2}" font-family="Arial,Helvetica,sans-serif" font-size="${Math.round(size / 3)}" font-weight="bold" fill="#6b7280" text-anchor="middle" dominant-baseline="central">${initials}</text>
  </svg>`;
  return Buffer.from(svg);
}
