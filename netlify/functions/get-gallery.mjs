// netlify/functions/get-gallery.mjs
import { getStore } from '@netlify/blobs';

function getCookie(req, name) {
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : '';
}

export default async (req) => {
  // Session cookie set by verify-code
  const sesh = getCookie(req, 'sesh');
  if (!sesh) return new Response('Unauthorized', { status: 401 });

  let payload;
  try {
    payload = JSON.parse(Buffer.from(sesh, 'base64url').toString('utf8'));
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  const code = payload.c;
  const meta = getStore('meta');

  // read the freshest copy
  const student = await meta.get(`students/${code}.json`, {
    type: 'json',
    consistency: 'strong'
  });

  if (!student) return new Response('Not found', { status: 404 });

  // If your importer writes previewKeys like "galleries/ABC123/Avery_preview.jpg",
  // expose them as public blob URLs that the browser can load:
  const toPublicBlobUrl = (key) => `/.netlify/blobs/site:meta/${key}`;
  const images = (student.previewKeys || []).map((k) => ({
    previewUrl: toPublicBlobUrl(k),
  }));

  const body = {
    code,
    eventName: student.eventName || '',
    studentLabel: student.studentLabel || '',
    grade: student.grade || '',
    teacher: student.teacher || '',
    school: student.school || '',
    images,
  };

  return new Response(JSON.stringify(body), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
};
