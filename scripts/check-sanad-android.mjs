import {readFile} from 'node:fs/promises';
import {apiOrigin, projectId} from './configure-sanad-android.mjs';

const config = JSON.parse(await readFile(process.argv[2] ?? 'config/android.json', 'utf8'));
if (!/^1:859176819205:android:[0-9a-f]+$/.test(config.FIREBASE_ANDROID_APP_ID ?? '') ||
    !/^AIza[0-9A-Za-z_-]{35}$/.test(config.FIREBASE_ANDROID_API_KEY ?? '')) {
  throw Error('A registered SANAD Android client configuration is required.');
}
const base = apiOrigin(config.MARKETPLACE_API_URL);
const health = await fetch(base + '/health', {redirect: 'error', signal: AbortSignal.timeout(15000)});
if (!health.ok || !health.headers.get('content-type')?.includes('application/json')) {
  throw Error('The native mobile API is not reachable yet.');
}
const body = await health.json();
if (body.service !== 'sanad-mobile-api' || body.firebaseProject !== projectId) {
  throw Error('The mobile API points to a different service.');
}
const unauthenticated = await fetch(base + '/api/marketplace/session', {
  redirect: 'error', signal: AbortSignal.timeout(15000),
});
if (unauthenticated.status !== 401 ||
    !unauthenticated.headers.get('content-type')?.includes('application/json')) {
  throw Error('The native API must enforce Firebase authentication without a browser sign-in gate.');
}
console.log('Registered Android client and protected mobile API checks passed.');
