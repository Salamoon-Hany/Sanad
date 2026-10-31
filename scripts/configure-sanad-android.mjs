import {spawnSync} from 'node:child_process';
import {mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

export const projectId = 'salamoon-services';
export const packageName = 'com.salamoon.sanad';

export function apiOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search ||
      url.hash || (url.pathname !== '/' && url.pathname !== '')) {
    throw Error('Use the HTTPS mobile API origin without a path or credentials.');
  }
  return url.origin;
}

export function clientConfig(sdk, apiUrl) {
  if (sdk.project_info?.project_id !== projectId ||
      String(sdk.project_info?.project_number) !== '859176819205') {
    throw Error('Android SDK configuration belongs to a different Firebase project.');
  }
  const client = sdk.client?.find(c =>
    c.client_info?.android_client_info?.package_name === packageName);
  const appId = client?.client_info?.mobilesdk_app_id;
  const key = client?.api_key?.[0]?.current_key;
  if (!/^1:859176819205:android:[0-9a-f]+$/.test(appId ?? '') ||
      !/^AIza[0-9A-Za-z_-]{35}$/.test(key ?? '')) {
    throw Error('The registered SANAD Android client is missing from the SDK configuration.');
  }
  return {
    FIREBASE_ANDROID_APP_ID: appId,
    FIREBASE_ANDROID_API_KEY: key,
    MARKETPLACE_API_URL: apiOrigin(apiUrl),
  };
}

function firebase(args) {
  const result = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['-y', 'firebase-tools@latest', ...args, '--project', projectId, '--json', '--non-interactive'],
    {encoding: 'utf8', shell: process.platform === 'win32'});
  if (result.error || result.status !== 0) {
    throw Error('Firebase access is required. Run npx -y firebase-tools@latest login and retry.');
  }
  const data = JSON.parse(result.stdout);
  if (data.status !== 'success') throw Error('Firebase configuration failed.');
  return data.result;
}

export async function configure(apiUrl) {
  const origin = apiOrigin(apiUrl);
  // Reuse the package's registration on retry instead of creating duplicate apps.
  const apps = firebase(['apps:list', 'ANDROID']);
  let app = apps.find(item => item.packageName === packageName);
  if (!app) app = firebase(['apps:create', 'ANDROID', 'SANAD Android', '--package-name', packageName]);
  const result = firebase(['apps:sdkconfig', 'ANDROID', app.appId]);
  const sdk = JSON.parse(result.fileContents);
  const config = clientConfig(sdk, origin);
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  await mkdir(path.join(root, 'config'), {recursive: true});
  await writeFile(path.join(root, 'config/android.json'), JSON.stringify(config, null, 2) + '\n');
  await writeFile(path.join(root, 'android/app/google-services.json'), JSON.stringify(sdk, null, 2) + '\n');
  return {projectId, packageName, appId: config.FIREBASE_ANDROID_APP_ID, apiUrl: origin};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const value = process.argv[process.argv.indexOf('--api-url') + 1];
    if (!process.argv.includes('--api-url') || !value) throw Error('Pass --api-url https://your-mobile-api-origin');
    console.log(JSON.stringify(await configure(value)));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
