import sharp from "sharp";
import { getStore } from "@netlify/blobs";

const LONG_EDGE = 1600;
const WATERMARK_TEXT = "Scott Ymker Photography • Social Preview";

export const handler = async (event) => {
  try {
    const qs = event.queryStringParameters || {};
    const code = (qs.code || "").toUpperCase();
    const image = (qs.image || "1.jpg").replace(/[^A-Za-z0-9._-]/g, "");
    if (!/^[A-Z0-9]{5,8}$/.test(code)) return err(400, "Invalid code");

    const store = getStore("redemptions");
    const claim = (await store.getJSON(code)) || { used: false };

    if (claim.used && claim.image !== image) {
      return err(403, "Free download already used.");
    }

    const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || "http://localhost:8888";
    const srcUrl = `${baseUrl}/proofs/${code}/${image}`;

    const srcRes = await fetch(srcUrl);
    if (!srcRes.ok) return err(404, "Image not found.");

    const srcBuf = Buffer.from(await srcRes.arrayBuffer());

    const img = sharp(srcBuf).rotate();
    const meta = await img.metadata();
    const resizeOpts = meta.width && meta.height && meta.width < meta.height
      ? { height: LONG_EDGE }
      : { width: LONG_EDGE };

    const { data: resizedBuf, info } = await img
      .resize({ ...resizeOpts, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, chromaSubsampling: "4:4:4" })
      .toBuffer({ resolveWithObject: true });

    const barH = Math.max(48, Math.round(info.width * 0.05));
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
      await store.setJSON(code, {
        used: true,
        image,
        at: new Date().toISOString(),
      });
    }

    const filename = `${code}-social.jpg`;
    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        "content-type": "image/jpeg",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
      body: finalBuf.toString("base64"),
    };
  } catch (e) {
    console.error(e);
    return err(500, "Server error");
  }
};

function err(statusCode, message) {
  return {
    statusCode,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    body: JSON.stringify({ error: message }),
  };
}

function escapeXml(s) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
