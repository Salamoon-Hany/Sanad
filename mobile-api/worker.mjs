// Server-only bridge to the existing SANAD marketplace. Never bundle its
// UPSTREAM_ACCESS_TOKEN in a mobile client or a static asset.
const PROJECT = 'salamoon-services';
const UPSTREAM = 'https://eslam-mobile-service-app.eslam-hanyram11.chatgpt.site';
const KEYS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const MAX_BODY = 1100000;
const json = (body, status = 200) => Response.json(body, {status, headers: {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
}});
const fail = (code, status) => { throw Object.assign(Error(code), {status}); };

function decode(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) fail('INVALID_CREDENTIALS', 401);
  const raw = atob(value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

export function createHandler({fetchImpl = fetch, now = Date.now} = {}) {
  let keys = new Map(), keyExpiry = 0, lastRefresh = 0;
  async function signingKey(kid) {
    if (now() >= keyExpiry || (!keys.has(kid) && now() - lastRefresh >= 60000)) {
      const response = await fetchImpl(KEYS, {redirect: 'error', signal: AbortSignal.timeout(10000)});
      if (!response.ok) fail('TEMPORARILY_UNAVAILABLE', 503);
      const document = await response.json();
      if (!Array.isArray(document.keys) || document.keys.length > 20) fail('TEMPORARILY_UNAVAILABLE', 503);
      const replacement = new Map();
      for (const key of document.keys) {
        if (key.kty === 'RSA' && typeof key.kid === 'string') {
          replacement.set(key.kid, await crypto.subtle.importKey('jwk', key,
            {name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256'}, false, ['verify']));
        }
      }
      if (!replacement.size) fail('TEMPORARILY_UNAVAILABLE', 503);
      keys = replacement; lastRefresh = now(); keyExpiry = now() + 3600000;
    }
    const key = keys.get(kid);
    if (!key) fail('INVALID_CREDENTIALS', 401);
    return key;
  }

  async function authenticate(request, allowUnverified) {
    const header = request.headers.get('Authorization') ?? '';
    if (header.length > 8192 || !header.startsWith('Bearer ')) fail('INVALID_CREDENTIALS', 401);
    const token = header.slice(7), pieces = token.split('.');
    if (pieces.length !== 3) fail('INVALID_CREDENTIALS', 401);
    let info, claims;
    try {
      info = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(decode(pieces[0])));
      claims = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(decode(pieces[1])));
    } catch { fail('INVALID_CREDENTIALS', 401); }
    if (info?.alg !== 'RS256' || typeof info.kid !== 'string' || info.kid.length > 200 ||
        claims?.aud !== PROJECT || claims.iss !== 'https://securetoken.google.com/' + PROJECT ||
        typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 128 ||
        typeof claims.email !== 'string' || !claims.email || claims.email.length > 254 ||
        !Number.isInteger(claims.exp) || !Number.isInteger(claims.iat) ||
        claims.exp * 1000 <= now() || claims.iat * 1000 > now() + 60000) {
      fail('INVALID_CREDENTIALS', 401);
    }
    let valid = false;
    try {
      valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', await signingKey(info.kid),
        decode(pieces[2]), new TextEncoder().encode(pieces[0] + '.' + pieces[1]));
    } catch (error) {
      if (error.status === 503) throw error;
      fail('INVALID_CREDENTIALS', 401);
    }
    if (!valid) fail('INVALID_CREDENTIALS', 401);
    if (!allowUnverified && claims.email_verified !== true) fail('FORBIDDEN', 403);
    return token;
  }

  async function boundedBody(request) {
    if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
      fail('UNSUPPORTED_MEDIA_TYPE', 415);
    }
    const reader = request.body?.getReader();
    if (!reader) fail('INVALID_REQUEST', 400);
    let count = 0; const chunks = [];
    try {
      for (;;) {
        const item = await reader.read(); if (item.done) break;
        count += item.value.byteLength;
        if (count > MAX_BODY) { await reader.cancel(); fail('PAYLOAD_TOO_LARGE', 413); }
        chunks.push(item.value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(count); let offset = 0;
    for (const item of chunks) { bytes.set(item, offset); offset += item.byteLength; }
    return bytes;
  }

  return async (request, env) => {
    try {
      const url = new URL(request.url);
      if (url.protocol !== 'https:') fail('SECURE_CONNECTION_REQUIRED', 400);
      if (request.headers.has('Origin')) fail('FORBIDDEN', 403);
      if (!env.UPSTREAM_ACCESS_TOKEN) fail('TEMPORARILY_UNAVAILABLE', 503);
      if (url.pathname === '/health' && request.method === 'GET') {
        return json({service: 'sanad-mobile-api', firebaseProject: PROJECT, status: 'ok'});
      }
      if (!['GET', 'POST'].includes(request.method)) fail('METHOD_NOT_ALLOWED', 405);
      if (!url.pathname.startsWith('/api/marketplace/') ||
          /[%\\\u0000-\u0020]/.test(url.pathname) || url.pathname.length > 500 ||
          url.pathname.includes('//') || url.pathname.split('/').some(p => p.startsWith('.'))) {
        fail('NOT_FOUND', 404);
      }
      const token = await authenticate(request,
        url.pathname === '/api/marketplace/signup-role' && request.method === 'POST');
      const body = request.method === 'POST' ? await boundedBody(request) : undefined;
      // A fresh header list prevents forwarding client cookies, forged site
      // identity headers, or a client-supplied upstream access credential.
      const response = await fetchImpl(UPSTREAM + url.pathname + url.search, {
        method: request.method,
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
          'OAI-Sites-Authorization': 'Bearer ' + env.UPSTREAM_ACCESS_TOKEN,
        },
        body, redirect: 'manual', signal: AbortSignal.timeout(60000),
      });
      if (response.status >= 300 && response.status < 400 ||
          !response.headers.get('Content-Type')?.includes('application/json')) {
        fail('TEMPORARILY_UNAVAILABLE', 503);
      }
      const result = new Response(response.body, {status: response.status, headers: {
        'Content-Type': 'application/json', 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
      }});
      return result;
    } catch (error) {
      const status = [400, 401, 403, 404, 405, 413, 415, 503].includes(error.status) ? error.status : 503;
      const code = ['INVALID_CREDENTIALS', 'FORBIDDEN', 'TEMPORARILY_UNAVAILABLE',
        'INVALID_REQUEST', 'UNSUPPORTED_MEDIA_TYPE', 'PAYLOAD_TOO_LARGE',
        'METHOD_NOT_ALLOWED', 'SECURE_CONNECTION_REQUIRED', 'NOT_FOUND'].includes(error.message)
        ? error.message : 'TEMPORARILY_UNAVAILABLE';
      return json({error: code, requestId: crypto.randomUUID()}, status);
    }
  };
}

const handler = createHandler();
export default {fetch: (request, env) => handler(request, env)};
