import { getStore } from "@netlify/blobs";

export const handler = async (event) => {
  try {
    const code = (event.queryStringParameters?.code || "").toUpperCase();
    if (!/^[A-Z0-9]{5,8}$/.test(code)) {
      return json(400, { error: "Invalid code" });
    }

    const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || "http://localhost:8888";

    // Try to load optional manifest
    let manifest = null;
    try {
      const m = await fetch(`${baseUrl}/manifest/students.json`, { method: "GET" });
      if (m.ok) manifest = await m.json();
    } catch {}

    let student = null;
    let images = [];

    if (manifest && manifest[code]) {
      const rec = manifest[code];
      student = {
        firstName: rec.FirstName ?? rec.firstName ?? "",
        lastName:  rec.LastName  ?? rec.lastName  ?? "",
        grade:     rec.Grade     ?? rec.grade     ?? "",
        teacher:   rec.Teacher   ?? rec.teacher   ?? "",
      };
      const list = rec.images?.length ? rec.images : ["1.jpg"];
      images = list.map((file) => ({
        file,
        url: `${baseUrl}/proofs/${code}/${file}`,
      }));
    } else {
      const head = await fetch(`${baseUrl}/proofs/${code}/1.jpg`, { method: "HEAD" });
      if (!head.ok) return json(404, { error: "Code not found" });
      images = [{ file: "1.jpg", url: `${baseUrl}/proofs/${code}/1.jpg` }];
      student = { firstName: "", lastName: "", grade: "", teacher: "" };
    }

    const store = getStore("redemptions");
    const claimed = (await store.getJSON(code)) || { used: false };

    return json(200, { ok: true, student, images, claimed });
  } catch (err) {
    console.error(err);
    return json(500, { error: "Server error" });
  }
};

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
    body: JSON.stringify(obj),
  };
}
