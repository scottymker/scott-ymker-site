# Reorder Galleries (Netlify) — Starter Pack

This adds a **post-picture-day** flow to your current repo: parents enter a 6‑character code, see their child’s gallery (watermarked previews), and buy reprints/digitals through Stripe Checkout. Storage uses **Netlify Blobs**. Print fulfillment is manual for now.

> Files below are ready to paste into your repo. The only edits you must make: set environment variables and fill in Stripe price IDs in `_lib/price-map.mjs`.

---

## Folder tree (new)

```
/access.html
/gallery.html
/thank-you.html
/assets/reorder.css
/assets/reorder.js
/netlify/functions/_lib/jwt.mjs
/netlify/functions/_lib/price-map.mjs
/netlify/functions/verify-code.mjs
/netlify/functions/get-gallery.mjs
/netlify/functions/preview.mjs
/netlify/functions/create-checkout-session.mjs
/netlify/functions/stripe-webhook.mjs
/netlify/functions/order-status.mjs
/netlify.toml
```

> **Assumption:** Your existing packages/add‑ons data lives as a JS file used by the current order page (e.g., `/assets/packages-data.js`). This gallery re‑order page will import that file so the product list stays identical. If the filename is different, just update the `<script src>` in `gallery.html`.

---

## 1) `access.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Access My Event • Scott Ymker Photography</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/reorder.css">
</head>
<body class="bg">
  <main class="center-card">
    <div class="card">
      <h1>Access My Event</h1>
      <p class="muted">Enter your 6‑character event code</p>
      <form id="codeForm" autocomplete="off">
        <input id="code" name="code" class="codebox" inputmode="latin" maxlength="6" pattern="[A-HJ-NP-Z2-9]{6}" placeholder="e.g. 6G7YQ5" aria-label="Event code" required />
        <button class="btn" type="submit">Next</button>
      </form>
      <p id="error" class="error" role="alert" hidden></p>
      <details class="faq">
        <summary>Where do I find my event code?</summary>
        <p>Your code is printed on the take‑home card or email from the photographer.</p>
      </details>
    </div>
  </main>
  <script>
  const form = document.getElementById('codeForm');
  const errorEl = document.getElementById('error');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    const code = (document.getElementById('code').value || '').toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g,'');
    if (code.length !== 6) { errorEl.textContent = 'Please enter a 6‑character code.'; errorEl.hidden = false; return; }
    try {
      const res = await fetch('/api/verify-code', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code }) });
      if (!res.ok) throw new Error(await res.text());
      // Success sets an HttpOnly cookie. Go to gallery.
      location.assign('/gallery.html');
    } catch (err) {
      errorEl.textContent = 'That code wasn\'t found. Double‑check and try again.';
      errorEl.hidden = false;
    }
  });
  </script>
</body>
</html>
```

---

## 2) `gallery.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Gallery • Scott Ymker Photography</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/reorder.css">
</head>
<body class="bg">
  <header class="topbar">
    <div class="container">
      <div class="brand">Scott Ymker Photography</div>
      <nav><a href="/access.html">Enter a different code</a></nav>
    </div>
  </header>

  <main class="container pad">
    <section id="hero" class="hero">
      <div>
        <h1 id="studentName">Loading…</h1>
        <p class="muted" id="eventLabel"></p>
      </div>
      <button id="checkoutBtn" class="btn" disabled>Go to Checkout</button>
    </section>

    <section>
      <h2>Photos</h2>
      <div id="grid" class="grid"></div>
    </section>

    <section>
      <h2>Packages</h2>
      <div id="packages"></div>
      <h3 class="mt">Add‑ons (require a package)</h3>
      <div id="addons"></div>
      <p class="total">Total: <span id="total">$0.00</span></p>
    </section>
  </main>

  <!-- Your existing full package details. Update src if different. -->
  <script src="/assets/packages-data.js"></script>
  <script src="/assets/reorder.js"></script>
</body>
</html>
```

---

## 3) `thank-you.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Thank You • Scott Ymker Photography</title>
  <link rel="stylesheet" href="/assets/reorder.css">
</head>
<body class="bg">
  <main class="center-card">
    <div class="card">
      <h1>Thank you!</h1>
      <p>Your order has been received. If you purchased digital images, your download link will appear below and be sent to your email.</p>
      <div id="downloads"></div>
    </div>
  </main>
  <script>
    (async () => {
      const p = new URLSearchParams(location.search);
      const sid = p.get('session_id');
      if (!sid) return;
      const res = await fetch(`/api/order-status?session_id=${encodeURIComponent(sid)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.download_url) {
        const d = document.getElementById('downloads');
        d.innerHTML = `<a class="btn" href="${data.download_url}">Download your digital images</a>`;
      }
    })();
  </script>
</body>
</html>
```

---

## 4) `/assets/reorder.css`

```css
:root{ --bg:#f6f7fb; --card:#fff; --ink:#0f172a; --muted:#6b7280; --border:#e5e7eb; --accent:#0ea5e9; }
*{ box-sizing:border-box; }
body{ margin:0; font-family:Inter, system-ui, Arial, sans-serif; color:var(--ink); background:var(--bg); }
.bg{ min-height:100vh; }
.center-card{ min-height:100vh; display:grid; place-items:center; padding:24px; }
.card{ width:min(560px,100%); background:var(--card); border:1px solid var(--border); border-radius:16px; padding:32px; box-shadow:0 8px 30px rgba(2,6,23,.04); }
h1{ margin:0 0 8px; font-size:32px; }
h2{ font-size:20px; margin:24px 0 8px; }
h3{ font-size:16px; margin:16px 0 8px; }
.muted{ color:var(--muted); }
.error{ color:#b91c1c; margin-top:8px; }
.faq{ margin-top:16px; }
.codebox{ width:100%; padding:14px 16px; font-size:22px; letter-spacing:2px; text-transform:uppercase; border:1px solid var(--border); border-radius:12px; }
.btn{ background:var(--accent); color:white; border:0; border-radius:12px; padding:12px 16px; font-weight:600; cursor:pointer; }
.btn[disabled]{ opacity:.5; cursor:not-allowed; }
.topbar{ background:white; border-bottom:1px solid var(--border); }
.topbar .container{ display:flex; align-items:center; justify-content:space-between; max-width:1100px; margin:auto; padding:12px 16px; }
.brand{ font-weight:700; }
.container{ max-width:1100px; margin:auto; }
.pad{ padding:24px 16px 64px; }
.hero{ display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:12px; }
.grid{ display:grid; grid-template-columns:repeat(auto-fill, minmax(160px,1fr)); gap:10px; }
.thumb{ width:100%; aspect-ratio:3/4; object-fit:cover; border-radius:10px; border:1px solid var(--border); background:#f8fafc; }
.item{ border:1px solid var(--border); border-radius:12px; padding:12px; margin:8px 0; display:flex; align-items:center; justify-content:space-between; gap:12px; }
.price{ font-weight:600; }
.total{ font-size:18px; font-weight:700; }
.mt{ margin-top:10px; }
```

---

## 5) `/assets/reorder.js`

```javascript
// Requires your existing packages data file to expose window.PACKAGES like:
// { packages: [{id:'A', name:'Package A', price: 35, description:'...'}, ...], addons: [{id:'F', name:'...'}] }

const money = (n) => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(n / 100);
let selected = { pkg: null, addons: new Set() };
let priceIndex = null; // Filled from /assets/packages-data.js

async function boot() {
  const grid = document.getElementById('grid');
  const nameEl = document.getElementById('studentName');
  const eventEl = document.getElementById('eventLabel');
  const btn = document.getElementById('checkoutBtn');

  // Load gallery
  const res = await fetch('/api/get-gallery');
  if (!res.ok) {
    nameEl.textContent = 'Please enter your code again';
    location.replace('/access.html');
    return;
  }
  const data = await res.json();
  nameEl.textContent = data.student_label;
  eventEl.textContent = data.event_label || '';
  grid.innerHTML = '';
  data.preview_keys.forEach((key) => {
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.src = `/api/preview?key=${encodeURIComponent(key)}`; // proxied via function
    img.className = 'thumb';
    grid.appendChild(img);
  });

  // Build product UI from your existing packages/addons data
  if (!window.PACKAGES) {
    console.warn('packages-data.js not found. Add it or import your current data.');
    window.PACKAGES = { packages: [], addons: [] };
  }
  const pkgWrap = document.getElementById('packages');
  window.PACKAGES.packages.forEach((p) => {
    const div = document.createElement('label');
    div.className = 'item';
    div.innerHTML = `
      <div><strong>${p.name}</strong><div class="muted">${p.description || ''}</div></div>
      <div>
        <div class="price">${money(p.price_cents)}</div>
        <input type="radio" name="pkg" value="${p.id}">
      </div>`;
    div.querySelector('input').addEventListener('change', () => { selected.pkg = p.id; updateTotal(); btn.disabled = false; });
    pkgWrap.appendChild(div);
  });

  const addonWrap = document.getElementById('addons');
  window.PACKAGES.addons.forEach((a) => {
    const div = document.createElement('label');
    div.className = 'item';
    div.innerHTML = `
      <div><strong>${a.name}</strong><div class="muted">${a.description || ''}</div></div>
      <div>
        <div class="price">${money(a.price_cents)}</div>
        <input type="checkbox" value="${a.id}">
      </div>`;
    div.querySelector('input').addEventListener('change', (e) => {
      if (e.target.checked) selected.addons.add(a.id); else selected.addons.delete(a.id);
      updateTotal();
    });
    addonWrap.appendChild(div);
  });

  btn.addEventListener('click', async () => {
    if (!selected.pkg) return alert('Please choose a package first');
    const body = {
      package: selected.pkg,
      addons: Array.from(selected.addons),
    };
    btn.disabled = true;
    const r = await fetch('/api/create-checkout-session', { method:'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify(body) });
    const payload = await r.json();
    if (r.ok && payload.url) {
      location.assign(payload.url);
    } else {
      alert(payload.error || 'Something went wrong creating checkout.');
      btn.disabled = false;
    }
  });

  function updateTotal(){
    const get = (id, list) => list.find(i => i.id === id);
    let total = 0;
    if (selected.pkg) total += get(selected.pkg, window.PACKAGES.packages)?.price_cents || 0;
    selected.addons.forEach(id => { total += get(id, window.PACKAGES.addons)?.price_cents || 0; });
    document.getElementById('total').textContent = money(total);
  }
}

boot();
```

---

## 6) `/netlify/functions/_lib/jwt.mjs`

```javascript
import crypto from 'node:crypto';

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
const fromB64url = (str) => Buffer.from(str.replace(/-/g,'+').replace(/_/g,'/'), 'base64');

export function signJWT(payload, secret, expiresInSeconds = 7200){
  const header = { alg:'HS256', typ:'JWT' };
  const exp = Math.floor(Date.now()/1000) + expiresInSeconds;
  const body = { ...payload, exp };
  const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(body))}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  return `${data}.${sig}`;
}

export function verifyJWT(token, secret){
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) throw new Error('bad token');
  const data = `${h}.${p}`;
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  if (expected !== s) throw new Error('signature');
  const payload = JSON.parse(fromB64url(p).toString('utf8'));
  if (payload.exp && payload.exp < Math.floor(Date.now()/1000)) throw new Error('expired');
  return payload;
}
```

---

## 7) `/netlify/functions/_lib/price-map.mjs`

```javascript
/**
 * Map your product SKUs to Stripe Price IDs.
 * Keep SKUs aligned with your existing order form: A..E, A1..E1, F..N, etc.
 *
 * Example:
 *  A  -> price_123
 *  F  -> price_abc
 */

export const PRICE_MAP = {
  // Packages (fill all)
  A: 'price_xxx', A1: 'price_xxx',
  B: 'price_xxx', B1: 'price_xxx',
  C: 'price_xxx', C1: 'price_xxx',
  D: 'price_xxx', D1: 'price_xxx',
  E: 'price_xxx', E1: 'price_xxx',
  // Add‑ons
  F: 'price_xxx', G: 'price_xxx', H: 'price_xxx', I: 'price_xxx', J: 'price_xxx', K: 'price_xxx', L: 'price_xxx', M: 'price_xxx', N: 'price_xxx',
  // Digitals (if you sell them post‑day)
  DIGI_FULL: 'price_xxx', // e.g., full‑res digital pack
};
```

---

## 8) `verify-code.mjs`

```javascript
import { getStore } from '@netlify/blobs';
import { signJWT } from './_lib/jwt.mjs';

export default async (req, context) => {
  try {
    const { code } = await req.json();
    if (!code || !/^[A-HJ-NP-Z2-9]{6}$/.test(code)) return new Response('bad code', { status: 400 });

    const store = getStore();
    const meta = await store.get(`meta/students/${code}.json`, { type: 'json' });
    if (!meta) return new Response('not found', { status: 404 });

    const jwt = signJWT({ code }, process.env.JWT_SECRET, 60 * 60 * 2); // 2h
    const headers = new Headers({ 'content-type': 'application/json' });
    headers.append('Set-Cookie', `reorder=${jwt}; Path=/; HttpOnly; SameSite=Lax; Max-Age=7200; Secure`);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (e) {
    return new Response('error', { status: 500 });
  }
};
```

---

## 9) `get-gallery.mjs`

```javascript
import { getStore } from '@netlify/blobs';
import { verifyJWT } from './_lib/jwt.mjs';

export default async (req, context) => {
  try {
    const cookie = req.headers.get('cookie') || '';
    const token = /(?:^|; )reorder=([^;]+)/.exec(cookie)?.[1];
    if (!token) return new Response('unauthorized', { status: 401 });
    const { code } = verifyJWT(decodeURIComponent(token), process.env.JWT_SECRET);

    const store = getStore();
    const meta = await store.get(`meta/students/${code}.json`, { type: 'json' });
    if (!meta) return new Response('not found', { status: 404 });

    // Return only safe fields
    return Response.json({
      student_label: meta.student_label, // e.g., "Emma Y."
      event_label: meta.event_label,
      preview_keys: meta.preview_keys,   // e.g., ["previews/Fall2025/AB2DEF/IMG_1234.jpg", ...]
    });
  } catch (e) {
    return new Response('error', { status: 500 });
  }
};
```

---

## 10) `preview.mjs` (serves preview images via key)

```javascript
import { getStore } from '@netlify/blobs';
import { verifyJWT } from './_lib/jwt.mjs';

export default async (req) => {
  try {
    const url = new URL(req.url);
    const key = url.searchParams.get('key');
    if (!key) return new Response('missing key', { status: 400 });

    // Optional: require a valid session so previews aren’t crawlable
    const cookie = req.headers.get('cookie') || '';
    const token = /(?:^|; )reorder=([^;]+)/.exec(cookie)?.[1];
    if (!token) return new Response('unauthorized', { status: 401 });
    const { code } = verifyJWT(decodeURIComponent(token), process.env.JWT_SECRET);
    if (!key.includes(`/${code}/`)) return new Response('forbidden', { status: 403 });

    const store = getStore();
    const blob = await store.get(key, { type: 'stream' });
    if (!blob) return new Response('not found', { status: 404 });
    const headers = new Headers({ 'cache-control': 'public, max-age=604800', 'content-type': 'image/jpeg' });
    return new Response(blob, { headers });
  } catch (e) {
    return new Response('error', { status: 500 });
  }
};
```

---

## 11) `create-checkout-session.mjs`

```javascript
import Stripe from 'stripe';
import { getStore } from '@netlify/blobs';
import { verifyJWT } from './_lib/jwt.mjs';
import { PRICE_MAP } from './_lib/price-map.mjs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async (req) => {
  try {
    const cookie = req.headers.get('cookie') || '';
    const token = /(?:^|; )reorder=([^;]+)/.exec(cookie)?.[1];
    if (!token) return new Response('unauthorized', { status: 401 });
    const { code } = verifyJWT(decodeURIComponent(token), process.env.JWT_SECRET);

    const { package: pkg, addons = [] } = await req.json();
    if (!pkg) return new Response('Missing package', { status: 400 });

    const store = getStore();
    const meta = await store.get(`meta/students/${code}.json`, { type: 'json' });
    if (!meta) return new Response('not found', { status: 404 });

    // Build line items
    const line_items = [];
    const p = PRICE_MAP[pkg];
    if (!p) return Response.json({ error: `Missing price for ${pkg}` }, { status: 400 });
    line_items.push({ price: p, quantity: 1 });
    for (const a of addons) {
      const pr = PRICE_MAP[a];
      if (pr) line_items.push({ price: pr, quantity: 1 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${process.env.SITE_BASE_URL}/thank-you.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_BASE_URL}/gallery.html`,
      metadata: {
        student_code: code,
        student_label: meta.student_label,
        event_label: meta.event_label,
      }
    });

    return Response.json({ url: session.url });
  } catch (e) {
    return Response.json({ error: e.message || 'error' }, { status: 500 });
  }
};
```

---

## 12) `stripe-webhook.mjs`

```javascript
import Stripe from 'stripe';
import { getStore } from '@netlify/blobs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = { path: '/api/stripe-webhook' };

export default async (req) => {
  const sig = req.headers.get('stripe-signature');
  let event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new Response('bad sig', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const store = getStore();

    // Persist a lightweight order record for the thank-you page to read
    await store.set(`orders/${session.id}.json`, JSON.stringify({
      status: 'paid',
      student_code: session.metadata?.student_code,
      student_label: session.metadata?.student_label,
      event_label: session.metadata?.event_label,
      customer_email: session.customer_details?.email || null,
      created: Date.now(),
    }), { contentType: 'application/json' });
  }

  return new Response('ok', { status: 200 });
};
```

---

## 13) `order-status.mjs`

```javascript
import { getStore } from '@netlify/blobs';

export default async (req) => {
  const url = new URL(req.url);
  const sid = url.searchParams.get('session_id');
  if (!sid) return new Response('missing', { status: 400 });
  const store = getStore();
  const order = await store.get(`orders/${sid}.json`, { type: 'json' });
  if (!order) return Response.json({ status: 'pending' }, { status: 200 });

  // If you sell digitals, you can generate a short-lived signed link via another function.
  // For MVP, just return a placeholder null.
  return Response.json({ status: order.status, download_url: order.download_url || null });
};
```

---

## 14) `netlify.toml`

```toml
[build]
  publish = "public" # keep your current value if different
  functions = "netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

# If your repo doesn't have a /public folder, remove the [build] publish line
# or set it to "/" so Netlify serves your root.
```

---

## Netlify Blobs structure

- `meta/students/{CODE}.json` (required)

```json
{
  "student_label": "Emma Y.",
  "event_label": "Fall 2025 • Lincoln Elementary",
  "preview_keys": [
    "previews/Fall2025/AB2DEF/IMG_1234.jpg",
    "previews/Fall2025/AB2DEF/IMG_1235.jpg"
  ]
}
```

- `previews/{EVENT}/{CODE}/IMG_1234.jpg` (JPEG, watermarked, \~1200px)
- (Optional now) `originals/{EVENT}/{CODE}/IMG_1234.jpg` for digital downloads later.
- `orders/{CHECKOUT_SESSION_ID}.json` written by webhook.

---

## Environment variables (Netlify → Site settings → Environment)

- `JWT_SECRET` — random long string.
- `STRIPE_SECRET_KEY` — from Stripe.
- `STRIPE_WEBHOOK_SECRET` — for the checkout webhook.
- `SITE_BASE_URL` — e.g. `https://www.scottymkersite.com` (no trailing slash).

(For a future importer script run from your laptop, we can add a PAT + site ID, but not needed to deploy this UI.)

---

## How to load your existing packages/add‑ons

- Ensure your current order page exposes a global like `window.PACKAGES = { packages:[...], addons:[...] }` **with full details and prices in cents**.
- Include that file via `<script src="/assets/packages-data.js"></script>` in `gallery.html`.
- **Stripe mapping:** add the corresponding Stripe price IDs in `_lib/price-map.mjs` for every SKU you want available post‑day.

---

## Minimal deployment steps

1. Add these files to the repo and commit.
2. In Netlify, set the **Environment variables** listed above.
3. In Stripe Dashboard → Products, create Prices for all SKUs and paste IDs into `_lib/price-map.mjs`.
4. In Stripe → Webhooks, add an endpoint to `https://YOUR_DOMAIN/api/stripe-webhook` with events: `checkout.session.completed`. Paste the signing secret into `STRIPE_WEBHOOK_SECRET`.
5. Deploy. Visit `/access.html`, enter a known test code that exists in Blobs under `meta/students/{CODE}.json`.

---

## Populating Blobs (quick manual method for a pilot)

For your first pilot, you can manually upload via a one‑off **temporary function** call or Netlify’s API. Easiest path:

- Use the Netlify Functions Console (or add a private admin function) to write `meta/students/{CODE}.json` and upload a couple of preview JPEGs to `previews/...` for a few students.
- Once we verify end‑to‑end, I’ll add a small Node importer that watermarks/resizes and pushes to Blobs in bulk.

---

## Notes / Next steps

- Background selection is intentionally omitted for reorders since images are already captured; shout if you want it anyway.
- We enforce that preview URLs include the student code before serving (basic protection against guessing).
- Add a Turnstile/hCaptcha on `/access.html` if the school requests extra brute‑force protection.
- When you’re ready to offer **digital downloads**, I’ll wire a `download.mjs` that signs a token and streams from `originals/...`.

```
```
