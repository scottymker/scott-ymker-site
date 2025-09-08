import fs from "node:fs";
import { parse } from "csv-parse";

const inputPath = process.argv[2] || "data/students.csv";
const outputPath = "public/manifest/students.json";

if (!fs.existsSync(inputPath)) {
  console.error(`CSV not found at ${inputPath}`);
  process.exit(1);
}

const input = fs.createReadStream(inputPath);
const outDir = "public/manifest";
fs.mkdirSync(outDir, { recursive: true });

const rows = [];
input.pipe(parse({ columns: true, trim: true }))
  .on("data", (r) => rows.push(r))
  .on("end", () => {
    const map = {};
    for (const r of rows) {
      const code = (r.Code || r.code || "").toUpperCase();
      if (!code) continue;
      const images = (r.ImageNames || r.images || "")
        .split(";").map(s => s.trim()).filter(Boolean);
      map[code] = {
        FirstName: r.FirstName || r.firstName || "",
        LastName:  r.LastName  || r.lastName  || "",
        Grade:     r.Grade     || r.grade     || "",
        Teacher:   r.Teacher   || r.teacher   || "",
        images: images.length ? images : ["1.jpg"],
      };
    }
    fs.writeFileSync(outputPath, JSON.stringify(map, null, 2));
    console.log(`Wrote ${outputPath} with ${Object.keys(map).length} codes.`);
  });
