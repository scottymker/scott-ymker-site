// v2-free-download.mjs — serves a 1600px, watermarked JPG; one free image per code
import sharp from "sharp";
import { getStore } from "@netlify/blobs";

const LONG_EDGE = Number(process.env.V2_LONG_EDGE || 1600); // social-friendly
const WATERMARK_TEXT = process.env.V2_WATERMARK || "Scott Ymker Photography • Social Preview";

export const handler = async (event) => {
  try {
    const qs = event.queryStringParameters || {};
    const code = (qs.code || "").toUpperCase().trim();
    const image = (qs.image || "1.jpg").replace(/[^A-Za-z0-9._-]/g, "");

    if (!/^[A-Z0-9]{5,8}$/.test(code)) return err(400, "Invalid code");

    const store = getStore(process.env.CLAIMS_STORE || "redemptions_v2");
    const claim = (await store.getJSON(code)) || { used: false };

    // Enforce one free image per code; allow re-download of the SAME image
    if (claim.used && claim.image !== image) return err(403, "Free download already used.");

    const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || "http://localhost:8888";
    const srcUrl = `${baseUrl}/v2/proofs/${code}/${image}`;
    const srcRes = await fetch(srcUrl);
    if (!srcRes.ok) return err(404, "Image not found.");

    const srcBuf = Buffer.from(await srcRes.arrayBuffer());

    // Resize for social (respect orientation)
    const img = sharp(srcBuf).rotate();
    const meta = await img.metadata();
    const resizeOpts = meta.width && meta.height && meta.width < meta.height
      ? { height: LONG_EDGE }
      : { width: LONG_EDGE };

    const { data: resizedBuf, info } = await img
      .resize({ ...resizeOpts, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, chromaSubsampling: "4:4:4" })
      .toBuffer({ resolveWithObject: true });

    // Subtle bottom bar watermark (SVG overlay)
    const barH = Math.max(48, Math.round(info.width * 0.05));       // ~5% height
    const fontSize = Math.min(Math.round(info.width * 0.035), Math.round(barH * 0.8));

    const overlaySvg = Buffer.from(
      `<svg width="${info.width}" height="${barH}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.35)"/>
        <text x="50%" y="${Math.round(barH*0.7)}" text-anchor="middle"
              font-family="Inter, Arial, sans-serif" font-size="${fontSize}"
              fill="white" opacity="0.95">${escapeXml(WATERMARK_TEXT)}</text>
      </svg>`
    );

    const finalBuf = await sharp(resizedBuf)
      .composite([{ input: overlaySvg, gravity: "south" }])
      .jpeg({ quality: 82, chromaSubsampling: "4:4:4" })
      .toBuffer();

    if (!claim.used) {
      await store.setJSON(code, { used: true, image, at: new Date().toISOString() });
    }

    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        "content-type": "image/jpeg",
        "content-disposition": `attachment; filename="${code}-social.jpg"`,
        "cache-control": "no-store",
      },
      body: finalBuf.toString("base64"),
    };
  } catch (e) {
    console.error(e);
    return err(500, "Server error");
  }
};

const err = (statusCode, message) => ({
  statusCode,
  headers: { "content-type": "application/json", "cache-control": "no-store" },
  body: JSON.stringify({ error: message }),
});

const escapeXml = (s) =>
  s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
