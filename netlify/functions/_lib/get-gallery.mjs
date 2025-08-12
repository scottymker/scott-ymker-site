import { getStore } from '@netlify/blobs';

function readCookie(req, name) {
  const h = req.headers.get('cookie') || '';
  const m = h.match(new RegExp(`${name}=([^;]+)`));
  return m ? m[1] : null;
}

export default async (req, ctx) => {
  const sesh = readCookie(req, 'sesh');
  if (!sesh) return new Response('Unauthorized', { status: 401 });
  const { c: code } = JSON.parse(Buffer.from(sesh, 'base64url').toString('utf8'));

  const meta = getStore('meta');
  const student = await meta.get(`students/${code}.json`, { type: 'json', consistency: 'strong' });
  if (!student) return new Response('Unauthorized', { status: 401 });

  // Build preview URLs that our preview function will serve
  const images = (student.previewKeys || []).map((key) => ({
    previewUrl: `/preview/${encodeURIComponent(key)}`,
  }));

  return Response.json({
    eventName: student.eventName,
    studentLabel: student.studentLabel,
    images,
  });
};
