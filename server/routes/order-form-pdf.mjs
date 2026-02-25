import { Router } from 'express';
import { adminGuard } from '../middleware/admin-guard.mjs';
import { query } from '../db.mjs';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

const router = Router();
router.use(adminGuard);

// ─── Brand constants ───────────────────────────
const BRAND = {
  accent:      [196, 112, 63],   // #c4703f
  accentLight: [248, 237, 228],  // warm light bg
  dark:        [34, 34, 34],     // near-black text
  muted:       [120, 120, 120],  // secondary text
  white:       [255, 255, 255],
  border:      [210, 210, 210],
  warmBg:      [252, 249, 245],  // off-white warm
  name:        'Scott Ymker Photography',
  address:     'PO Box 544, Armour, SD 57313',
  phone:       '(605) 550-0828',
  email:       'scott@scottymkerphotos.com',
  web:         'scottymkerphotos.com',
};

// ─── Package & Add-on data ────────────────────
const PACKAGES = [
  { code: 'A',  price: '$32', tag: 'Best Value', items: ['1 - 8x10 Class Composite', '2 - 8x10', '2 - 5x7', '8 - wallets', '16 - mini wallets'] },
  { code: 'A1', price: '$41', tag: '+ Digital Files', items: ['Everything in A', '+ Digital File'] },
  { code: 'B',  price: '$27', tag: 'Family Special', items: ['1 - 8x10 Class Composite', '1 - 8x10', '2 - 5x7', '16 - wallets'] },
  { code: 'B1', price: '$32', tag: '+ 2 5x7 Prints', items: ['Everything in B', '+ 2 extra 5x7'] },
  { code: 'C',  price: '$22', tag: 'Most Popular', items: ['1 - 8x10 Class Composite', '1 - 8x10', '2 - 3½x5', '4 - wallets', '16 - mini wallets'] },
  { code: 'C1', price: '$27', tag: '+ 2 5x7 Prints', items: ['Everything in C', '+ 2 extra 5x7'] },
  { code: 'D',  price: '$18', tag: '', items: ['1 - 8x10 Class Composite', '2 - 5x7', '8 - wallets'] },
  { code: 'D1', price: '$23', tag: '+ 16 Mini Wallets', items: ['Everything in D', '+ 16 mini wallets'] },
  { code: 'E',  price: '$12', tag: '', items: ['2 - 5x7', '2 - 3½x5', '4 - wallets'] },
  { code: 'E1', price: '$17', tag: '+ 8 Bonus Wallets', items: ['Everything in E', '+ 8 wallets'] },
];

const ADDONS = [
  { code: 'F', qty: '1',  desc: '8x10 Print',            price: '$6' },
  { code: 'G', qty: '2',  desc: '5x7 Prints',            price: '$6' },
  { code: 'H', qty: '4',  desc: '3½x5 Prints',           price: '$6' },
  { code: 'I', qty: '24', desc: 'Wallets',                price: '$18' },
  { code: 'J', qty: '8',  desc: 'Wallets',                price: '$6' },
  { code: 'K', qty: '16', desc: 'Mini Wallets',           price: '$6' },
  { code: 'L', qty: '1',  desc: 'Retouching',             price: '$7' },
  { code: 'M', qty: '1',  desc: '8x10 Class Composite',   price: '$8' },
  { code: 'N', qty: '1',  desc: 'Digital File',           price: '$15' },
];

const BG_CODES = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'];

// ─── Helper: draw rounded rect ────────────────
function roundRect(doc, x, y, w, h, r) {
  doc.moveTo(x + r, y)
    .lineTo(x + w - r, y)
    .quadraticCurveTo(x + w, y, x + w, y + r)
    .lineTo(x + w, y + h - r)
    .quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    .lineTo(x + r, y + h)
    .quadraticCurveTo(x, y + h, x, y + h - r)
    .lineTo(x, y + r)
    .quadraticCurveTo(x, y, x + r, y);
}

// ─── Helper: draw accent bar ──────────────────
function accentBar(doc, x, y, w, h) {
  doc.save();
  doc.fillColor(BRAND.accent);
  doc.rect(x, y, w, h).fill();
  doc.restore();
}

// ─── Helper: section title ────────────────────
function sectionTitle(doc, text, x, y, w) {
  accentBar(doc, x, y, w, 22);
  doc.fillColor(BRAND.white).fontSize(10).font('Helvetica-Bold');
  doc.text(text, x + 8, y + 6, { width: w - 16 });
  doc.fillColor(BRAND.dark);
}

// ─── SIDE A: Package Display ──────────────────
function renderSideA(doc, event, pageW, pageH, ml, mt) {
  const contentW = pageW;

  // ── Header band ──
  accentBar(doc, ml, mt, contentW, 56);
  doc.fillColor(BRAND.white).fontSize(24).font('Helvetica-Bold');
  doc.text('Picture Day', ml + 16, mt + 8, { width: contentW - 32 });
  doc.fontSize(11).font('Helvetica');
  doc.text('Packages & Pricing', ml + 16, mt + 34, { width: contentW - 180 });

  // Brand name right-aligned
  doc.fontSize(9).font('Helvetica-Bold');
  doc.text(BRAND.name, ml + contentW - 200, mt + 12, { width: 184, align: 'right' });
  doc.fontSize(7.5).font('Helvetica').fillColor([255, 255, 255, 0.8]);
  doc.text(`${BRAND.phone}  •  ${BRAND.web}`, ml + contentW - 200, mt + 24, { width: 184, align: 'right' });
  doc.fillColor(BRAND.dark);

  // ── Event info ──
  let yPos = mt + 66;
  if (event) {
    doc.fontSize(13).font('Helvetica-Bold').fillColor(BRAND.accent);
    doc.text(event.name, ml + 16, yPos);
    doc.fillColor(BRAND.muted).fontSize(9).font('Helvetica');
    if (event.date) {
      const d = new Date(event.date);
      doc.text(`Photo Day: ${d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, ml + 16, yPos + 16);
    }
    yPos += 36;
  }

  // ── Package grid (2 columns, 5 rows) ──
  const pkgColW = (contentW - 20) / 2;
  const pkgRowH = 68;
  const pkgStartY = yPos + 4;

  sectionTitle(doc, 'PRINT PACKAGES', ml, pkgStartY, contentW);
  yPos = pkgStartY + 28;

  for (let i = 0; i < PACKAGES.length; i++) {
    const pkg = PACKAGES[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const px = ml + col * (pkgColW + 20);
    const py = yPos + row * (pkgRowH + 6);

    // Card background
    doc.save();
    doc.fillColor(i % 2 === 0 ? BRAND.warmBg : BRAND.white);
    doc.roundedRect(px, py, pkgColW, pkgRowH, 4).fill();
    doc.strokeColor(BRAND.border).lineWidth(0.5);
    doc.roundedRect(px, py, pkgColW, pkgRowH, 4).stroke();
    doc.restore();

    // Package code circle
    doc.save();
    doc.fillColor(BRAND.accent);
    doc.circle(px + 18, py + 18, 12).fill();
    doc.fillColor(BRAND.white).fontSize(11).font('Helvetica-Bold');
    const codeW = doc.widthOfString(pkg.code);
    doc.text(pkg.code, px + 18 - codeW / 2, py + 13);
    doc.restore();

    // Price
    doc.fillColor(BRAND.accent).fontSize(16).font('Helvetica-Bold');
    doc.text(pkg.price, px + pkgColW - 52, py + 8, { width: 44, align: 'right' });

    // Tag
    if (pkg.tag) {
      doc.fillColor(BRAND.muted).fontSize(6.5).font('Helvetica');
      doc.text(pkg.tag.toUpperCase(), px + 36, py + 6, { width: pkgColW - 100 });
    }

    // Items
    doc.fillColor(BRAND.dark).fontSize(7).font('Helvetica');
    const itemText = pkg.items.join('  •  ');
    doc.text(itemText, px + 36, py + 18, { width: pkgColW - 60, lineGap: 1.5 });
  }

  // ── Add-ons table ──
  const addonY = yPos + Math.ceil(PACKAGES.length / 2) * (pkgRowH + 6) + 12;
  sectionTitle(doc, 'ADD-ON ITEMS (with any package purchase)', ml, addonY, contentW);

  let tY = addonY + 28;
  // Table header
  doc.fillColor(BRAND.muted).fontSize(7).font('Helvetica-Bold');
  doc.text('PKG', ml + 8, tY, { width: 30 });
  doc.text('QTY', ml + 40, tY, { width: 30 });
  doc.text('DESCRIPTION', ml + 75, tY, { width: 200 });
  doc.text('PRICE', ml + contentW - 60, tY, { width: 50, align: 'right' });
  tY += 14;

  doc.strokeColor(BRAND.border).lineWidth(0.3);
  doc.moveTo(ml + 8, tY - 2).lineTo(ml + contentW - 8, tY - 2).stroke();

  for (const addon of ADDONS) {
    doc.fillColor(BRAND.dark).fontSize(7.5).font('Helvetica');
    doc.text(addon.code, ml + 8, tY, { width: 30 });
    doc.text(addon.qty, ml + 40, tY, { width: 30, align: 'center' });
    doc.text(addon.desc, ml + 75, tY, { width: 200 });
    doc.text(addon.price, ml + contentW - 60, tY, { width: 50, align: 'right' });
    tY += 13;
  }

  doc.fillColor(BRAND.muted).fontSize(6).font('Helvetica');
  doc.text('Add-on items may only be ordered with the purchase of a package.', ml + 8, tY + 4);
  tY += 18;

  // ── Backgrounds grid ──
  sectionTitle(doc, 'BACKGROUNDS', ml, tY, contentW);
  tY += 28;
  const bgSize = 48;
  const bgGap = 12;
  const bgTotalW = BG_CODES.length * bgSize + (BG_CODES.length - 1) * bgGap;
  const bgStartX = ml + (contentW - bgTotalW) / 2;

  for (let i = 0; i < BG_CODES.length; i++) {
    const bx = bgStartX + i * (bgSize + bgGap);
    // Draw placeholder box
    doc.save();
    doc.strokeColor(BRAND.border).lineWidth(0.5);
    doc.roundedRect(bx, tY, bgSize, bgSize, 3).stroke();
    doc.fillColor(BRAND.muted).fontSize(8).font('Helvetica-Bold');
    doc.text(BG_CODES[i], bx, tY + bgSize / 2 - 4, { width: bgSize, align: 'center' });
    if (i === 0) {
      doc.fillColor(BRAND.accent).fontSize(5).font('Helvetica');
      doc.text('DEFAULT', bx, tY + bgSize + 3, { width: bgSize, align: 'center' });
    }
    doc.restore();
  }

  return tY + bgSize + 18;
}

// ─── SIDE B: Order Form + QR ──────────────────
function renderSideB(doc, event, siteUrl, qrBuffer, pageW, pageH, ml, mt) {
  const contentW = pageW;
  let yPos = mt;

  // ── Header ──
  accentBar(doc, ml, yPos, contentW, 36);
  doc.fillColor(BRAND.white).fontSize(16).font('Helvetica-Bold');
  doc.text('Order Form', ml + 16, yPos + 10);
  if (event) {
    doc.fontSize(9).font('Helvetica');
    doc.text(event.name, ml + contentW - 200, yPos + 14, { width: 184, align: 'right' });
  }
  doc.fillColor(BRAND.dark);
  yPos += 44;

  // ── Online Ordering section (with QR) ──
  const onlineH = 100;
  doc.save();
  doc.fillColor(BRAND.accentLight);
  doc.roundedRect(ml, yPos, contentW, onlineH, 6).fill();
  doc.strokeColor(BRAND.accent).lineWidth(1);
  doc.roundedRect(ml, yPos, contentW, onlineH, 6).stroke();
  doc.restore();

  // QR code
  if (qrBuffer) {
    doc.image(qrBuffer, ml + 14, yPos + 10, { width: 80 });
  }

  const qrTextX = ml + 108;
  doc.fillColor(BRAND.accent).fontSize(14).font('Helvetica-Bold');
  doc.text('Order Online — Fast & Easy!', qrTextX, yPos + 12, { width: contentW - 122 });
  doc.fillColor(BRAND.dark).fontSize(9).font('Helvetica');
  doc.text('Scan the QR code with your phone to order and pay securely online.', qrTextX, yPos + 32, { width: contentW - 130 });
  doc.text('No envelope needed — just scan, pick your package, and checkout.', qrTextX, yPos + 45, { width: contentW - 130 });
  doc.fillColor(BRAND.muted).fontSize(7.5).font('Helvetica');
  doc.text(`Or visit: ${siteUrl}/multi-order.html`, qrTextX, yPos + 64, { width: contentW - 130 });
  doc.fillColor(BRAND.accent).fontSize(8).font('Helvetica-Bold');
  doc.text('Credit / Debit / Apple Pay / Google Pay accepted', qrTextX, yPos + 80, { width: contentW - 130 });
  doc.fillColor(BRAND.dark);

  yPos += onlineH + 14;

  // ── Divider with "OR" ──
  const divY = yPos;
  doc.strokeColor(BRAND.border).lineWidth(0.5);
  doc.moveTo(ml + 16, divY + 8).lineTo(ml + contentW / 2 - 20, divY + 8).stroke();
  doc.moveTo(ml + contentW / 2 + 20, divY + 8).lineTo(ml + contentW - 16, divY + 8).stroke();
  doc.fillColor(BRAND.muted).fontSize(9).font('Helvetica-Bold');
  doc.text('OR', ml + contentW / 2 - 10, divY + 2, { width: 20, align: 'center' });
  doc.fillColor(BRAND.dark);
  yPos += 24;

  // ── "Pay by Check/Cash" label ──
  doc.fillColor(BRAND.dark).fontSize(11).font('Helvetica-Bold');
  doc.text('Pay by Check or Cash', ml + 16, yPos);
  doc.fillColor(BRAND.muted).fontSize(7.5).font('Helvetica');
  doc.text('Fill out the form below. Place check or cash in the provided envelope and return on picture day.', ml + 16, yPos + 14, { width: contentW - 32 });
  yPos += 32;

  // ── Student Information ──
  const leftColW = (contentW - 20) / 2;
  const rightColW = leftColW;
  const leftX = ml;
  const rightX = ml + leftColW + 20;

  sectionTitle(doc, 'STUDENT INFORMATION', leftX, yPos, leftColW);
  sectionTitle(doc, 'PARENT / GUARDIAN', rightX, yPos, rightColW);
  yPos += 28;

  const fields = [
    { label: 'First Name:', x: leftX },
    { label: 'Last Name:', x: leftX },
    { label: 'Teacher:', x: leftX },
    { label: 'Grade:', x: leftX },
    { label: 'School:', x: leftX },
  ];
  const parentFields = [
    { label: 'Name:' },
    { label: 'Phone:' },
    { label: 'Email:' },
  ];

  const lineH = 18;
  let fY = yPos;
  for (const f of fields) {
    doc.fillColor(BRAND.dark).fontSize(7.5).font('Helvetica');
    doc.text(f.label, leftX + 8, fY + 3);
    doc.strokeColor(BRAND.border).lineWidth(0.3);
    doc.moveTo(leftX + 60, fY + lineH - 2).lineTo(leftX + leftColW - 8, fY + lineH - 2).stroke();
    fY += lineH;
  }

  fY = yPos;
  for (const f of parentFields) {
    doc.fillColor(BRAND.dark).fontSize(7.5).font('Helvetica');
    doc.text(f.label, rightX + 8, fY + 3);
    doc.strokeColor(BRAND.border).lineWidth(0.3);
    doc.moveTo(rightX + 50, fY + lineH - 2).lineTo(rightX + rightColW - 8, fY + lineH - 2).stroke();
    fY += lineH;
  }

  // Studio use box in parent section
  fY = yPos + parentFields.length * lineH + 4;
  doc.save();
  doc.fillColor(BRAND.warmBg);
  doc.roundedRect(rightX + 4, fY, rightColW - 8, 28, 3).fill();
  doc.strokeColor(BRAND.border).lineWidth(0.3);
  doc.roundedRect(rightX + 4, fY, rightColW - 8, 28, 3).stroke();
  doc.fillColor(BRAND.muted).fontSize(7).font('Helvetica-Bold');
  doc.text('STUDIO USE ONLY', rightX + 12, fY + 4);
  doc.fontSize(6.5).font('Helvetica');
  doc.text('Default Background: F1', rightX + 12, fY + 16);
  doc.restore();

  yPos += fields.length * lineH + 8;

  // ── Order table ──
  sectionTitle(doc, 'ORDER — CHECK PACKAGES & ADD-ONS', ml, yPos, contentW);
  yPos += 26;

  // Split into two sub-tables: packages left, add-ons right
  const tblW = (contentW - 16) / 2;

  // Packages table
  doc.fillColor(BRAND.muted).fontSize(6.5).font('Helvetica-Bold');
  doc.text('BKGD', ml + 4, yPos, { width: 28 });
  doc.text('PKG', ml + 34, yPos, { width: 22 });
  doc.text('PRINT PACKAGES', ml + 60, yPos, { width: 100 });
  doc.text('PRICE', ml + 158, yPos, { width: 36, align: 'right' });
  doc.text('QTY', ml + 196, yPos, { width: 24, align: 'center' });
  doc.text('TOTAL', ml + 222, yPos, { width: 36, align: 'right' });

  yPos += 12;
  doc.strokeColor(BRAND.border).lineWidth(0.3);
  doc.moveTo(ml + 4, yPos - 1).lineTo(ml + tblW, yPos - 1).stroke();

  const pkgRows = PACKAGES.map(p => ({ bkgd: '', code: p.code, name: `Package ${p.code}`, price: p.price }));
  for (const row of pkgRows) {
    doc.fillColor(BRAND.dark).fontSize(7).font('Helvetica');
    // Empty box for bkgd
    doc.strokeColor(BRAND.border).lineWidth(0.3);
    doc.rect(ml + 8, yPos + 1, 14, 9).stroke();
    doc.text(row.code, ml + 34, yPos + 1, { width: 22 });
    doc.text(row.name, ml + 60, yPos + 1, { width: 96 });
    doc.text(row.price, ml + 158, yPos + 1, { width: 36, align: 'right' });
    // Qty box
    doc.rect(ml + 198, yPos + 1, 18, 9).stroke();
    // Total line
    doc.text('$', ml + 228, yPos + 1, { width: 30 });
    doc.moveTo(ml + 234, yPos + 10).lineTo(ml + tblW, yPos + 10).stroke();
    yPos += 13;
  }

  // Add-ons table (right side)
  let aY = yPos - (pkgRows.length * 13) - 12;
  const aX = ml + tblW + 16;

  doc.fillColor(BRAND.muted).fontSize(6.5).font('Helvetica-Bold');
  doc.text('BKGD', aX, aY, { width: 28 });
  doc.text('PKG', aX + 30, aY, { width: 22 });
  doc.text('ADD-ON ITEMS', aX + 56, aY, { width: 100 });
  doc.text('PRICE', aX + 148, aY, { width: 36, align: 'right' });
  doc.text('QTY', aX + 186, aY, { width: 24, align: 'center' });
  doc.text('TOTAL', aX + 212, aY, { width: 36, align: 'right' });

  aY += 12;
  doc.strokeColor(BRAND.border).lineWidth(0.3);
  doc.moveTo(aX, aY - 1).lineTo(aX + tblW - 8, aY - 1).stroke();

  for (const addon of ADDONS) {
    doc.fillColor(BRAND.dark).fontSize(7).font('Helvetica');
    doc.strokeColor(BRAND.border).lineWidth(0.3);
    doc.rect(aX + 4, aY + 1, 14, 9).stroke();
    doc.text(addon.code, aX + 30, aY + 1, { width: 22 });
    doc.text(`${addon.qty}× ${addon.desc}`, aX + 56, aY + 1, { width: 90 });
    doc.text(addon.price, aX + 148, aY + 1, { width: 36, align: 'right' });
    doc.rect(aX + 188, aY + 1, 18, 9).stroke();
    doc.text('$', aX + 218, aY + 1, { width: 30 });
    doc.moveTo(aX + 224, aY + 10).lineTo(aX + tblW - 8, aY + 10).stroke();
    aY += 13;
  }

  // Total enclosed row
  const totalY = Math.max(yPos, aY) + 4;
  doc.save();
  doc.fillColor(BRAND.accent);
  doc.roundedRect(ml + contentW - 160, totalY, 152, 20, 3).fill();
  doc.fillColor(BRAND.white).fontSize(9).font('Helvetica-Bold');
  doc.text('TOTAL ENCLOSED', ml + contentW - 152, totalY + 5, { width: 90 });
  doc.text('$', ml + contentW - 40, totalY + 5, { width: 30 });
  doc.moveTo(ml + contentW - 30, totalY + 16).lineTo(ml + contentW - 8, totalY + 16).stroke();
  doc.restore();

  // ── Footer ──
  const footY = totalY + 30;
  doc.strokeColor(BRAND.border).lineWidth(0.5);
  // Dashed perforation line
  doc.dash(4, { space: 3 });
  doc.moveTo(ml, footY).lineTo(ml + contentW, footY).stroke();
  doc.undash();
  doc.fillColor(BRAND.muted).fontSize(6.5).font('Helvetica');
  doc.text('▲ Remove envelope at perforation. Insert check or cash. Moisten glue strip and seal. ▲', ml, footY + 4, { width: contentW, align: 'center' });

  const envY = footY + 18;
  doc.fillColor(BRAND.dark).fontSize(9).font('Helvetica-Bold');
  doc.text('Make checks payable to: Scott Ymker Photography', ml + 16, envY);
  doc.fillColor(BRAND.muted).fontSize(6.5).font('Helvetica');
  doc.text('Dishonored checks are subject to electronic recovery and a processing fee.', ml + 16, envY + 14, { width: contentW / 2 });
  doc.text('Use of a check as payment is your express authorization of this policy and terms.', ml + 16, envY + 24, { width: contentW / 2 });

  return envY + 40;
}

// ─── Main Route ───────────────────────────────
// GET /api/admin/events/:eventId/order-form-pdf?size=letter|legal
router.get('/:eventId/order-form-pdf', async (req, res) => {
  try {
    const { eventId } = req.params;
    const size = (req.query.size || 'letter').toLowerCase();

    const eventResult = await query('SELECT * FROM events WHERE id = $1', [eventId]);
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const event = eventResult.rows[0];

    const siteUrl = process.env.SITE_URL || 'http://192.168.1.63';
    const orderUrl = `${siteUrl}/multi-order.html`;

    // Generate QR code for online ordering
    const qrBuffer = await QRCode.toBuffer(orderUrl, {
      margin: 1,
      width: 200,
      color: { dark: '#c4703f', light: '#ffffff' },
    });

    const pageSize = size === 'legal' ? 'LEGAL' : 'LETTER';
    const margin = 28;

    const doc = new PDFDocument({ size: pageSize, margin });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    const pageW = doc.page.width - margin * 2;
    const pageH = doc.page.height - margin * 2;

    // ── Page 1: Package showcase ──
    renderSideA(doc, event, pageW, pageH, margin, margin);

    // ── Page 2: Order form ──
    doc.addPage({ size: pageSize, margin });
    renderSideB(doc, event, siteUrl, qrBuffer, pageW, pageH, margin, margin);

    doc.end();
    await new Promise((resolve) => doc.on('end', resolve));

    const pdfBuffer = Buffer.concat(chunks);
    const safeName = event.name.replace(/\s+/g, '_');
    const filename = `${safeName}_Order_Form_${size}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('GET /events/:eventId/order-form-pdf error:', err);
    return res.status(500).json({ error: 'Failed to generate order form PDF' });
  }
});

export default router;
