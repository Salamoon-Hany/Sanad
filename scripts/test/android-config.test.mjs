import test from 'node:test';
import assert from 'node:assert/strict';
import {apiOrigin, clientConfig} from '../configure-sanad-android.mjs';
const sdk = () => ({project_info: {project_id: 'salamoon-services', project_number: '859176819205'},
  client: [{client_info: {mobilesdk_app_id: '1:859176819205:android:abcdef',
    android_client_info: {package_name: 'com.salamoon.sanad'}},
    api_key: [{current_key: 'AIza' + 'a'.repeat(35)}]}]});
test('only three public Android build values are emitted', () => {
  assert.deepEqual(Object.keys(clientConfig(sdk(), 'https://api.example/')).sort(),
    ['FIREBASE_ANDROID_API_KEY', 'FIREBASE_ANDROID_APP_ID', 'MARKETPLACE_API_URL']);
});
test('another project or Android package cannot be used by accident', () => {
  const other = sdk(); other.project_info.project_id = 'other';
  assert.throws(() => clientConfig(other, 'https://api.example'));
  const wrongPackage = sdk(); wrongPackage.client[0].client_info.android_client_info.package_name = 'com.example.other';
  assert.throws(() => clientConfig(wrongPackage, 'https://api.example'));
});
test('web application IDs and missing keys are rejected', () => {
  const web = sdk(); web.client[0].client_info.mobilesdk_app_id = '1:859176819205:web:abcdef';
  assert.throws(() => clientConfig(web, 'https://api.example'));
  const missing = sdk(); missing.client[0].api_key = [];
  assert.throws(() => clientConfig(missing, 'https://api.example'));
});
test('API URL is HTTPS origin-only and never carries a token', () => {
  assert.equal(apiOrigin('https://api.example/'), 'https://api.example');
  for (const value of ['http://api.example', 'https://user@api.example',
    'https://api.example?token=secret', 'https://api.example/path']) {
    assert.throws(() => apiOrigin(value));
  }
});
