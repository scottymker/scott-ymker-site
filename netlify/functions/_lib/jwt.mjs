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
