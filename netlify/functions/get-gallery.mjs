// netlify/functions/get-gallery.mjs
import { getStore } from '@netlify/blobs';

function readCookie(req, name) {
  const raw = req.headers.get('cookie') || '';
  const m = raw.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : '';
}

function decodeSesh(val) {
  if (!val) return null;
  try {
    // base64url -> utf8
    const b64 = val.replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(b64, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Normalize gallery key and build the CDN URL to the *galleries* store.
function galleryCdnUrl(key) {
  if (!key) return '';
  const norm = String(key).replace(/^\/+/, '').replace(/^galleries\//, '');
  // This is Netlify’s public Blob CDN path for the "galleries" site store:
  return `/.netlify/blobs/site:galleries/${encodeURIComponent(norm)}`;
}

export default async (req) => {
  try {
    if (req.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // 1) Auth via cookie set by verify-code
    const seshCookie = readCookie(req, 'sesh');
    const sesh = decodeSesh(seshCookie);
    if (!sesh || !sesh.c || !sesh.e || Date.now() > Number(sesh.e)) {
      return new Response('Unauthorized', { status: 401 });
    }
    const code = String(sesh.c).toUpperCase();

    // 2) Load student metadata from the "meta" store
    const meta = getStore('meta');
    const student =
      (await meta.get(`students/${code}.json`, {
        type: 'json',
        consistency: 'strong',
      })) || null;

    if (!student) {
      return new Response('Not found', { status: 404 });
    }

    // 3) Build images array. Prefer previewKeys; fall back to any existing images.
    let images = [];
    const previewKeys = Array.isArray(student.previewKeys) ? student.previewKeys : [];

    if (previewKeys.length) {
      images = previewKeys.map((k) => ({
        key: k,
        previewUrl: galleryCdnUrl(k),
      }));
    } else if (Array.isArray(student.images)) {
      images = student.images.map((img) => {
        const k = img.key || img.previewKey || '';
        const candidate =
          img.previewUrl && img.previewUrl.includes('site:galleries/')
            ? img.previewUrl
            : galleryCdnUrl(k || img.previewUrl || '');
        return { key: k || img.previewUrl || '', previewUrl: candidate };
      });
    }

    // 4) Shape the response for the gallery page
    const body = {
      code,
      eventName: student.eventName || 'Fall Picture Day',
      studentLabel: student.studentLabel || sesh.s || 'Student',
      grade: student.grade || '',
      teacher: student.teacher || '',
      school: student.school || '',
      images,
      // Keep raw keys in case the client wants to build alternates/fallbacks
      previewKeys,
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  } catch (err) {
    // Helpful in Netlify function logs
    console.error('get-gallery error:', err);
    return new Response('Server error', { status: 500 });
  }
};
