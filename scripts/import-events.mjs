// See usage notes printed if args missing.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'csv-parse';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { getStore } from '@netlify/blobs';

const argv = parseArgs(process.argv.slice(2));
if (!argv.event || !argv.csv || !argv['images-root']) {
  console.log(`Usage:
NETLIFY_AUTH_TOKEN=... NETLIFY_SITE_ID=... node scripts/import-events.mjs \\
  --event "Fall Picture Day" \\
  --csv ./data/students.csv \\
  --images-root ./exports \\
  --site https://YOUR-SITE.netlify.app \\
  --watermark "Scott Ymker Photography" \\
  --upload-originals=false
CSV headers: first,last,teacher,grade,images_dir,code  (code optional)`);
  process.exit(1);
}
reqEnv('NETLIFY_AUTH_TOKEN'); reqEnv('NETLIFY_SITE_ID');

const SITE_ID = process.env.NETLIFY_SITE_ID;
const TOKEN = process.env.NETLIFY_AUTH_TOKEN;

const EVENT_NAME = argv.event;
const CSV_PATH = argv.csv;
const IMAGES_ROOT = argv['images-root'];
const SITE_BASE = argv.site || 'https://example.com';
const WM_TEXT = argv.watermark || 'Scott Ymker Photography';
const UPLOAD_ORIG = (argv['upload-originals'] || 'false').toString().toLowerCase() === 'true';

const previews = getStore({ name:'previews', siteID:SITE_ID, token:TOKEN });
const originals = getStore({ name:'originals', siteID:SITE_ID, token:TOKEN });
const meta = getStore({ name:'meta', siteID:SITE_ID, token:TOKEN });

await ensureDir('out');

const rows = await readCsv(CSV_PATH);
const usedCodes = new Set();
const results = [];

for (const r of rows) {
  const first = (r.first||'').trim();
  const last  = (r.last||'').trim();
  const teacher = (r.teacher||'').trim();
  const grade   = (r.grade||'').trim();
  const dirRel  = (r.images_dir||'').trim();
  let code = (r.code||'').trim().toUpperCase();

  if (!first || !last || !dirRel) { console.warn('Skipping row', r); continue; }
  if (!code || usedCodes.has(code)) code = genCode(usedCodes);
  usedCodes.add(code);

  const folder = path.resolve(IMAGES_ROOT, dirRel);
  const files = (await fsp.readdir(folder)).filter(f=>/\.(jpe?g|png)$/i.test(f)).map(f=>path.join(folder, f));
  if (!files.length) { console.warn('No images:', folder); continue; }

  const previewKeys = [], originalKeys = [];
  for (const file of files) {
    const base = path.basename(file).replace(/\.(png|jpg|jpeg)$/i,'');
    const prevKey = `galleries/${code}/${base}_preview.jpg`;
    const origKey = `galleries/${code}/${base}.jpg`;

    const img = sharp(file).rotate();
    const metaInfo = await img.metadata();
    const width = Math.min(1600, metaInfo.width || 1600);
    const svg = watermarkSvg(width, WM_TEXT);

    const previewBuf = await img.resize({ width, withoutEnlargement:true, fit:'inside' })
      .composite([{ input: Buffer.from(svg), gravity:'south' }])
      .jpeg({ quality:82 }).toBuffer();

    await previews.set(prevKey, previewBuf, { metadata:{ contentType:'image/jpeg' } });
    previewKeys.push(prevKey);

    if (UPLOAD_ORIG) {
      await originals.set(origKey, await fsp.readFile(file), { metadata:{ contentType:'image/jpeg' } });
      originalKeys.push(origKey);
    }
  }

  const student = {
    code, eventName: EVENT_NAME,
    studentLabel: `${first} ${last[0]}.`,
    teacher, grade, previewKeys,
    ...(UPLOAD_ORIG ? { originalKeys } : {})
  };
  await meta.set(`students/${code}.json`, JSON.stringify(student), {});
  results.push({ code, first, last, teacher, grade, images_dir: dirRel, url: `${SITE_BASE}/access.html?code=${code}` });
  console.log(`Imported ${first} ${last[0]}. (${code}) – ${previewKeys.length} images`);
}

await writeCsv('out/event-codes.csv', results);
await makeQrPdf('out/event-codes.pdf', results, EVENT_NAME);
console.log('Done → out/event-codes.csv, out/event-codes.pdf');


// ---- helpers ----
function parseArgs(a){const o={};for(let i=0;i<a.length;i++){const k=a[i];if(k.startsWith('--'))o[k.replace(/^--/,'')]=a[i+1]&& !a[i+1].startsWith('--')?a[++i]:'true';}return o;}
function reqEnv(n){ if(!process.env[n]){ console.error('Missing env '+n); process.exit(1);} }
async function ensureDir(d){ try{await fsp.mkdir(d,{recursive:true});}catch{} }
async function readCsv(file){ const rec=[]; await new Promise((res,rej)=>{ fs.createReadStream(file).pipe(parse({columns:true,trim:true})).on('data',r=>rec.push(r)).on('end',res).on('error',rej);}); return rec;}
function genCode(used){ const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c=''; do{ c=Array.from({length:6},()=>A[Math.floor(Math.random()*A.length)]).join(''); }while(used.has(c)); return c; }
function watermarkSvg(width,text){ const pad=22, fs=Math.round(width/28), h=fs+pad, w=Math.max(600,width);
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${w}" height="${h}" fill="rgba(0,0,0,0.28)"/>
  <text x="${pad}" y="${Math.round(h-pad/2)}" font-family="Inter, Arial, sans-serif" font-size="${fs}" fill="#fff">${text}</text></svg>`;}
async function writeCsv(out, rows){ const headers=['code','first','last','teacher','grade','images_dir','url'];
  const lines=[headers.join(',')].concat(rows.map(r=>headers.map(h=>`"${(r[h]||'').toString().replace(/"/g,'""')}"`).join(',')));
  await fsp.writeFile(out, lines.join('\n')); }
async function makeQrPdf(outPath, rows, eventName){
  const doc=new PDFDocument({size:'LETTER', margin:36}); const s=fs.createWriteStream(outPath); doc.pipe(s);
  const cols=2, rowsP=5, gap=16; const pageW=doc.page.width-doc.page.margins.left-doc.page.margins.right;
  const pageH=doc.page.height-doc.page.margins.top-doc.page.margins.bottom;
  const cardW=(pageW-gap)/cols, cardH=(pageH-gap*(rowsP-1))/rowsP;
  for (let i=0;i<rows.length;i++){
    if (i && i%(cols*rowsP)===0) doc.addPage();
    const c=i%cols; const r=Math.floor((i%(cols*rowsP))/cols);
    const x=doc.page.margins.left + c*(cardW+gap);
    const y=doc.page.margins.top + r*(cardH+gap);
    const row=rows[i];
    doc.roundedRect(x,y,cardW,cardH,8).stroke();
    doc.fontSize(14).font('Helvetica-Bold').text('Scott Ymker Photography', x+16, y+14);
    doc.fontSize(12).font('Helvetica').text(eventName, x+16, y+32);
    doc.fontSize(22).font('Helvetica-Bold').text(row.code, x+16, y+60);
    doc.fontSize(12).font('Helvetica').text(`${row.first} ${row.last?.[0]||''}.  •  ${row.teacher||''}  •  ${row.grade||''}`, x+16, y+90);
    const url=`${row.url}`;
    const qr=await QRCode.toBuffer(url,{margin:1,width:140});
    doc.image(qr, x+cardW-140-16, y+20);
    doc.fontSize(10).text('Scan to access gallery', x+cardW-140-16, y+20+140+6);
    doc.fontSize(10).text(url, x+16, y+cardH-24, {width:cardW-32});
  }
  doc.end(); await new Promise(res=>s.on('finish',res));
}
