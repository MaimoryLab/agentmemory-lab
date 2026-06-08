import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const manifest = JSON.parse(readFileSync('browser-extension/manifest.json', 'utf8'));
if ((manifest.content_scripts || []).some((script) => script.type === 'module')) {
  throw new Error('Chrome content scripts must not be declared as module scripts.');
}

const files = [
  'browser-extension/content-script.js',
  'browser-extension/service-worker.js',
  'browser-extension/popup.js',
  'browser-extension/options.js',
  'browser-extension/sidepanel.js',
  'browser-extension/shared/schema.js',
  'browser-extension/shared/api.js',
  'browser-extension/shared/page-types.js',
  'browser-extension/shared/site-config.js'
];

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`${file} failed syntax check.`);
}

const contentScript = readFileSync('browser-extension/content-script.js', 'utf8');
const siteConfig = readFileSync('browser-extension/shared/site-config.js', 'utf8');
const contentProviders = [...contentScript.matchAll(/id:\s*'([^']+)'/g)].map((match) => match[1]);
const sharedProviders = [...siteConfig.matchAll(/\n\s*([a-z0-9_-]+):\s*\{\s*\n\s*id:\s*'([^']+)'/g)].map((match) => match[2]);

const missingInContent = sharedProviders.filter((id) => !contentProviders.includes(id));
const missingInShared = contentProviders.filter((id) => !sharedProviders.includes(id));
if (missingInContent.length || missingInShared.length) {
  throw new Error(`Provider config mismatch. Missing in content: ${missingInContent.join(', ') || 'none'}; missing in shared: ${missingInShared.join(', ') || 'none'}`);
}

console.log('browser extension checks ok');
