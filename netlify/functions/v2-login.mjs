// v2-login.mjs — validates a code, returns student meta + image list for /v2
import { getStore } from "@netlify/blobs";

export const handler = async (event) => {
  try {
    const code = (event.queryStringParameters?.code || "").toUpperCase().trim();
    if (!/^[A-Z0-9]{5,8}$/.test(code)) return json(400, { error: "Invalid code" });

    // Use Netlify-provided URL vars for absolute links; fallback for local dev
    const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || "http://localhost:8888";
    const basePath = "/v2";

    // OPTIONAL: read manifest for names/grades and multi-image support
    let manifest = null;
    try {
      const m = await fetch(`${baseUrl}${basePath}/manifest/students.json`, { method: "GET" });
      if (m.ok) manifest = await m.json();
    } catch { /* no manifest is fine */ }

    // Resolve student + images
    let student = { firstName: "", lastName: "", grade: "", teacher: "" };
    let images = [];

    if (manifest && manifest[code]) {
      const rec = manifest[code];
      student = {
        firstName: rec.FirstName ?? rec.firstName ?? "",
        lastName:  rec.LastName  ?? rec.lastName  ?? "",
        grade:     rec.Grade     ?? rec.grade     ?? "",
        teacher:   rec.Teacher   ?? rec.teacher   ?? "",
      };
      const list = Array.isArray(rec.images) && rec.images.length ? rec.images : ["1.jpg"];
      images = list.map((file) => ({ file, url: `${baseUrl}${basePath}/proofs/${code}/${file}` }));
    } else {
      // Fallback: assume /v2/proofs/<CODE>/1.jpg exists
      const head = await fetch(`${baseUrl}${basePath}/proofs/${code}/1.jpg`, { method: "HEAD" });
      if (!head.ok) return json(404, { error: "Code not found" });
      images = [{ file: "1.jpg", url: `${baseUrl}${basePath}/proofs/${code}/1.jpg` }];
    }

    // Claim status stored separately for V2
    const store = getStore(process.env.CLAIMS_STORE || "redemptions_v2");
    const claimed = (await store.getJSON(code)) || { used: false };

    return json(200, { ok: true, student, images, claimed });
  } catch (e) {
    console.error(e);
    return json(500, { error: "Server error" });
  }
};

const json = (statusCode, obj) => ({
  statusCode,
  headers: { "content-type": "application/json", "cache-control": "no-store" },
  body: JSON.stringify(obj),
});
