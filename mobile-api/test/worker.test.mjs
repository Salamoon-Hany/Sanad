import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../worker.mjs';

const clock = 1800000000000;
const env = {UPSTREAM_ACCESS_TOKEN: 'unit-test-server-secret'};
const pair = await crypto.subtle.generateKey(
  {name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256'}, true, ['sign', 'verify']);
const jwk = {...await crypto.subtle.exportKey('jwk', pair.publicKey), kid: 'test-key', alg: 'RS256'};
const encode = value => Buffer.from(value).toString('base64url');
async function token(overrides = {}) {
  const header = encode(JSON.stringify({alg: 'RS256', kid: 'test-key'}));
  const payload = encode(JSON.stringify({aud: 'salamoon-services',
    iss: 'https://securetoken.google.com/salamoon-services', sub: 'test-user',
    email: 'test@example.invalid', email_verified: true,
    iat: clock / 1000 - 20, exp: clock / 1000 + 3500, ...overrides}));
  return header + '.' + payload + '.' + encode(await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(header + '.' + payload)));
}
function fixture(reply = () => Response.json({account: {uid: 'test-user'}})) {
  const calls = [];
  const handle = createHandler({now: () => clock, fetchImpl: async (url, options) => {
    if (url.startsWith('https://www.googleapis.com/')) return Response.json({keys: [jwk]});
    calls.push({url, options}); return reply();
  }});
  return {handle, calls};
}
const request = (path = '/api/marketplace/session', options = {}) =>
  new Request('https://mobile.example' + path, options);

test('health exposes service metadata, while missing server configuration fails closed', async () => {
  const {handle} = fixture();
  assert.equal((await handle(request('/health'), {})).status, 503);
  const result = await handle(request('/health'), env);
  assert.equal(result.status, 200);
  assert.equal((await result.json()).firebaseProject, 'salamoon-services');
});

test('missing or forged credentials never reach the marketplace', async () => {
  const {handle, calls} = fixture();
  assert.equal((await handle(request(), env)).status, 401);
  const pieces = (await token()).split('.');
  const signature = Buffer.from(pieces[2], 'base64url'); signature[0] ^= 1;
  pieces[2] = signature.toString('base64url');
  assert.equal((await handle(request(undefined, {headers: {
    Authorization: 'Bearer ' + pieces.join('.'),
  }}), env)).status, 401);
  assert.equal(calls.length, 0);
});

test('wrong project, issuer, expiry and future issue time are rejected', async () => {
  const {handle, calls} = fixture();
  for (const claims of [{aud: 'other'}, {iss: 'https://example.invalid'},
    {exp: clock / 1000 - 1}, {iat: clock / 1000 + 120}, {sub: ''}]) {
    assert.equal((await handle(request(undefined, {headers: {
      Authorization: 'Bearer ' + await token(claims),
    }}), env)).status, 401);
  }
  assert.equal(calls.length, 0);
});

test('only the signup-role route accepts a signed unverified identity', async () => {
  const {handle, calls} = fixture();
  const authorization = 'Bearer ' + await token({email_verified: false});
  assert.equal((await handle(request(undefined, {headers: {Authorization: authorization}}), env)).status, 403);
  assert.equal((await handle(request('/api/marketplace/signup-role', {
    method: 'POST', headers: {Authorization: authorization, 'Content-Type': 'application/json'},
    body: '{"role":"customer"}',
  }), env)).status, 200);
  assert.equal(calls.length, 1);
});

test('verified requests preserve identity and query without forwarding cookies or forged site headers', async () => {
  const {handle, calls} = fixture();
  const idToken = await token();
  const result = await handle(request('/api/marketplace/workers?services=plumber', {
    headers: {Authorization: 'Bearer ' + idToken, Cookie: 'private=client',
      'OAI-Sites-Authorization': 'client-forgery', 'oai-authenticated-user-id': 'forged-owner'},
  }), env);
  assert.equal(result.status, 200);
  assert.equal(calls[0].url, 'https://eslam-mobile-service-app.eslam-hanyram11.chatgpt.site/api/marketplace/workers?services=plumber');
  const headers = new Headers(calls[0].options.headers);
  assert.equal(headers.get('Authorization'), 'Bearer ' + idToken);
  assert.equal(headers.get('OAI-Sites-Authorization'), 'Bearer unit-test-server-secret');
  assert.equal(headers.get('Cookie'), null);
  assert.equal(headers.get('oai-authenticated-user-id'), null);
  assert.equal(calls[0].options.redirect, 'manual');
});

test('invalid routes, browser origins and insecure connections are blocked', async () => {
  const {handle, calls} = fixture();
  assert.equal((await handle(request('/api/auth/login'), env)).status, 404);
  assert.equal((await handle(request('/api/marketplace/a%2Fb'), env)).status, 404);
  assert.equal((await handle(request(undefined, {headers: {Origin: 'https://evil.example'}}), env)).status, 403);
  assert.equal((await handle(new Request('http://mobile.example/health'), env)).status, 400);
  assert.equal(calls.length, 0);
});

test('POST body limits and media type apply before upstream writes', async () => {
  const {handle, calls} = fixture();
  const Authorization = 'Bearer ' + await token();
  assert.equal((await handle(request('/api/marketplace/orders', {
    method: 'POST', headers: {Authorization, 'Content-Type': 'text/plain'}, body: '{}',
  }), env)).status, 415);
  assert.equal((await handle(request('/api/marketplace/orders', {
    method: 'POST', headers: {Authorization, 'Content-Type': 'application/json'}, body: 'x'.repeat(1100001),
  }), env)).status, 413);
  assert.equal(calls.length, 0);
});

test('upstream redirects and HTML never become a response or credential leak', async () => {
  const Authorization = 'Bearer ' + await token();
  for (const reply of [() => Response.redirect('https://evil.example', 302),
    () => new Response('<html>private upstream content</html>', {headers: {'Content-Type': 'text/html'}})]) {
    const {handle} = fixture(reply);
    const response = await handle(request(undefined, {headers: {Authorization}}), env);
    assert.equal(response.status, 503);
    const body = await response.text();
    assert.ok(!body.includes('private upstream') && !body.includes('unit-test-server-secret'));
  }
});
