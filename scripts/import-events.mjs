// scripts/import-events.mjs
// Usage:
//  NETLIFY_AUTH_TOKEN=xxx NETLIFY_SITE_ID=yyy \
//  node scripts/import-events.mjs \
//    --event "Fall Picture Day" \
//    --csv ./data/students.csv \
//    --images-root ./exports \
//    --site https://your-site.netlify.app \
//    --watermark "Scott Ymker Photography" \
//    --upload-originals=false
//
// Outputs:
//  out/event-codes.pdf  (QR cards)
//  out/event-codes.csv  (codes + student info)

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'csv-parse';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { getStore } from '@netlify/blobs';

const argv = parseArgs(process.argv.slice(2));
reqEnv('NETLIFY_AUTH_TOKEN'); reqEnv('NETLIFY_SITE_ID');

const SITE_ID = process.env.NETLIFY_SITE_ID;
const TOKEN = process.env.NETLIFY_AUTH_TOKEN;

const EVENT_NAME = must('--event');
const CSV_PATH = must('--csv');
const IMAGES_ROOT = must('--images-root');
const SITE_BASE = argv['--site'] || 'https://example.com';
const WM_TEXT = argv['--watermark'] || 'Scott Ymker Photography';
const UPLOAD_ORIG = (argv['--upload-originals'] || 'false').toString().toLowerCase() === 'true';

const previews = getStore({ name: 'previews', siteID: SITE_ID, token: TOKEN });
const originals = getStore({ name: 'originals', siteID: SITE_ID, token: TOKEN });
const meta = getStore({ name: 'meta', siteID: SITE_ID, token: TOKEN });

await ensureDir('out');

const rows = await readCsv(CSV_PATH);
const usedCodes = new Set();

const results = [];
for (const row of rows) {
  const first = (row.first || '').trim();
  const last = (row.last || '').trim();
  const teacher = (row.teacher || '').trim();
  const grade = (row.grade || '').trim();
  const dirRel = (row.images_dir || '').trim();
  let code = (row.code || '').trim().toUpperCase();

  if (!first || !last || !dirRel) {
    console.warn('Skipping row (missing first/last/images_dir):', row);
    continue;
  }
  if (!code) code = genCode(usedCodes);
  if (usedCodes.has(code)) code = genCode(usedCodes);
  usedCodes.add(code);

  const studentLabel = `${first} ${last[0] || ''}.`;
  const folder = path.resolve(IMAGES_ROOT, dirRel);
  const files = (await fsp.readdir(folder))
    .filter(f => /\.(jpe?g|png)$/i.test(f))
    .map(f => path.join(folder, f));

  if (files.length === 0) {
    console.warn(`No images for ${first} ${last} at ${folder}`);
    continue;
  }

  const previewKeys = [];
  const originalKeys = [];

  for (const file of files) {
    const base = path.basename(file).replace(/\.(png|jpg|jpeg)$/i, '');
    const prevKey = `galleries/${code}/${base}_preview.jpg`;
    const origKey = `galleries/${code}/${base}.jpg`;

    // Build preview (resize + watermark)
    const img = sharp(file).rotate(); // auto-orient
    const metaInfo = await img.metadata();
    const width = Math.min(1600, metaInfo.width || 1600);

    const svg = watermarkSvg(width, WM_TEXT);
    const previewBuf = await img
      .resize({ width, withoutEnlargement: true, fit: 'inside' })
      .composite([{ input: Buffer.from(svg), gravity: 'south' }])
      .jpeg({ quality: 82 })
      .toBuffer();

    await previews.set(prevKey, previewBuf, { metadata: { contentType: 'image/jpeg' } });
    previewKeys.push(prevKey);

    if (UPLOAD_ORIG) {
      const origBuf = await fsp.readFile(file);
      await originals.set(origKey, origBuf, { metadata: { contentType: 'image/jpeg' } });
      originalKeys.push(origKey);
    }
  }

  // Write the student meta JSON
  const studentJson = {
    code,
    eventName: EVENT_NAME,
    studentLabel,
    teacher,
    grade,
    previewKeys,
    ...(UPLOAD_ORIG ? { originalKeys } : {})
  };
  await meta.set(`students/${code}.json`, JSON.stringify(studentJson), {});

  results.push({ code, first, last, teacher, grade, images_dir: dirRel, url: `${SITE_BASE}/access.html?code=${code}` });
  console.log(`Imported ${studentLabel} (${code}) with ${previewKeys.length} previews`);
}

// Write CSV + QR PDF
await writeCsv('out/event-codes.csv', results);
await makeQrPdf('out/event-codes.pdf', results, SITE_BASE);
console.log(`\nDone. ${results.length} students imported.\nCSV: out/event-codes.csv\nPDF: out/event-codes.pdf`);


// ---------- helpers ----------
function parseArgs(args) {
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const k = args[i];
    if (k.startsWith('--')) {
      const v = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true';
      out[k] = v;
    }
  }
  return out;
}
function must(key) { if (!argv[key]) { console.error(`Missing ${key}`); process.exit(1); } return argv[key]; }
function reqEnv(n) { if (!process.env[n]) { console.error(`Missing env ${n}`); process.exit(1); } }
async function readCsv(file) {
  const records = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(file)
      .pipe(parse({ columns: true, trim: true }))
      .on('data', (r) => records.push(r))
      .on('end', resolve)
      .on('error', reject);
  });
  return records;
}
function genCode(used) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1
  let code = '';
  do {
    code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  } while (used.has(code));
  return code;
}
function watermarkSvg(width, text) {
  const pad = 22;
  const fontSize = Math.round(width / 28);
  const rectH = fontSize + pad;
  const w = Math.max(600, width);
  return `
    <svg width="${w}" height="${rectH}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${w}" height="${rectH}" fill="rgba(0,0,0,0.28)"/>
      <text x="${pad}" y="${Math.round(rectH - pad/2)}"
            font-family="Inter, Arial, sans-serif"
            font-size="${fontSize}" fill="#fff">${escapeXml(text)}</text>
    </svg>`;
}
function escapeXml(s){return s.replace(/[<>&'"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));}
async function writeCsv(outPath, rows) {
  const headers = ['code','first','last','teacher','grade','images_dir','url'];
  const lines = [headers.join(',')].concat(rows.map(r => headers.map(h => `"${(r[h]||'').toString().replace(/"/g,'""')}"`).join(',')));
  await fsp.writeFile(outPath, lines.join('\n'));
}
async function makeQrPdf(outPath, rows, siteBase) {
  const doc = new PDFDocument({ size: 'LETTER', margin: 36 });
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  const cols = 2, rowsPerPage = 5, gap = 16;
  const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const pageH = doc.page.height - doc.page.margins.top - doc.page.margins.bottom;

  const cardW = (pageW - gap) / cols;
  const cardH = (pageH - gap * (rowsPerPage - 1)) / rowsPerPage;

  let i = 0;
  for (const r of rows) {
    if (i && i % (cols * rowsPerPage) === 0) doc.addPage();
    const col = (i % cols);
    const row = Math.floor((i % (cols * rowsPerPage)) / cols);
    const x = doc.page.margins.left + col * (cardW + gap);
    const y = doc.page.margins.top + row * (cardH + gap);

    // Card frame
    doc.roundedRect(x, y, cardW, cardH, 8).stroke();

    // Title
    doc.fontSize(14).font('Helvetica-Bold').text('Scott Ymker Photography', x + 16, y + 14);
    doc.fontSize(12).font('Helvetica').text(EVENT_NAME, x + 16, y + 32);

    // Code + name
    doc.fontSize(22).font('Helvetica-Bold').text(r.code, x + 16, y + 60);
    doc.fontSize(12).font('Helvetica').text(`${r.first} ${r.last[0] || ''}.  •  ${r.teacher || ''}  •  ${r.grade || ''}`, x + 16, y + 90);

    // QR
    const url = `${siteBase}/access.html?code=${r.code}`;
    const qrPng = await QRCode.toBuffer(url, { margin: 1, width: Math.min(140, cardW/3) });
    const qrX = x + cardW - (qrPng.width || 140) - 16;
    const qrY = y + 20;
    doc.image(qrPng, qrX, qrY);

    doc.fontSize(10).text('Scan to access gallery', qrX, qrY + (qrPng.height || 140) + 6);
    doc.fontSize(10).text(url, x + 16, y + cardH - 24, { width: cardW - 32 });

    i++;
  }

  doc.end();
  await new Promise(res => stream.on('finish', res));
}
