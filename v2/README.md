# V2 Access Portal (Branch Deploy)

This bundle contains a working "Access My Event" v2 preview using Netlify Functions + Netlify Blobs.

## Files
- `public/access.html` – UI
- `public/assets/js/access.js` – client logic
- `netlify/functions/login.mjs` – validates code, returns images + claim state
- `netlify/functions/free-download.mjs` – serves social-size watermarked JPEG and records claim
- `scripts/build-manifest.mjs` – builds `public/manifest/students.json` from your CSV
- `netlify.toml` – routes and bundler config

## Quick Start
1. Create branch: `git checkout -b v2`
2. Copy these files into your repo in the same structure.
3. Add one sample proof: `public/proofs/YIF9RN/1.jpg` (make folders).
4. (Optional) Export your Google Sheet to `data/students.csv` and run:
   ```bash
   npm run build:manifest
   ```
5. Local dev:
   ```bash
   npm i
   npx netlify dev
   ```
6. Open `http://localhost:8888/access.html`, enter `YIF9RN`, click **Free Social Download**.
7. Commit and push the branch:
   ```bash
   git add .
   git commit -m "V2 access portal preview"
   git push -u origin v2
   ```

## Netlify Branch Deploy + Domain
- In Netlify > **Site settings > Build & deploy > Branches**, enable branch deploys for `v2`.
- In **Domain management > Branch subdomains**, map branch `v2` to a subdomain such as `v2.schools.yourdomain.com`.
- Visit `https://v2.yourdomain.com/access.html` to test without touching production.

## Notes
- Social size = 1600px long edge, with a subtle bottom watermark bar.
- One free image per code. If a code is already claimed, the same image can be re-downloaded.
- Images are loaded from `/public/proofs/<CODE>/1.jpg` by default (or from `students.json` if present).
