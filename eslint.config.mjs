// Lightweight lint config (catches undefined names, unused imports, dead code).
// Run with:  npx eslint .
const browser = Object.fromEntries([
  'window', 'document', 'navigator', 'location', 'history', 'localStorage', 'sessionStorage', 'indexedDB', 'fetch', 'URL', 'URLSearchParams',
  'Blob', 'File', 'FileReader', 'Node', 'Event', 'CustomEvent', 'IntersectionObserver', 'createImageBitmap', 'Image', 'AbortController',
  'crypto', 'CSS', 'Notification', 'caches', 'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame',
  'Intl', 'TextDecoder', 'TextEncoder', 'atob', 'btoa', 'AudioContext', 'webkitAudioContext', 'Response', 'Request', 'Headers', 'self',
  'globalThis', 'performance', 'structuredClone', 'getComputedStyle', 'HTMLElement', 'MutationObserver', 'ResizeObserver', 'alert', 'confirm', 'queueMicrotask',
].map((n) => [n, 'readonly']));
const node = Object.fromEntries([
  'process', 'Buffer', 'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'URL', 'URLSearchParams', 'TextDecoder', 'TextEncoder',
  'fetch', 'AbortController', 'globalThis', 'structuredClone', 'crypto', 'queueMicrotask',
].map((n) => [n, 'readonly']));

const rules = {
  'no-undef': 'error', 'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }], 'no-redeclare': 'error', 'no-dupe-keys': 'error',
  'no-dupe-args': 'error', 'no-unreachable': 'warn', 'no-const-assign': 'error', 'no-func-assign': 'error', 'no-import-assign': 'error',
  'no-self-assign': 'error', 'no-unsafe-finally': 'error', 'no-unused-labels': 'error', 'use-isnan': 'error', 'valid-typeof': 'error',
  'no-empty': ['warn', { allowEmptyCatch: true }], 'no-cond-assign': ['error', 'except-parens'], 'eqeqeq': ['warn', 'smart'],
};

export default [
  { ignores: ['node_modules/**', 'dist/**', 'legacy/**', 'test/fixtures/**'] },
  { files: ['src/**/*.js', 'service-worker.js'], languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: { ...browser, ServiceWorkerGlobalScope: 'readonly', clients: 'readonly', skipWaiting: 'readonly' } }, rules },
  { files: ['src/theme-init.js'], languageOptions: { sourceType: 'script', globals: browser }, rules },
  { files: ['functions/**/*.js', 'scripts/**/*.mjs', 'test/**/*.mjs', 'eslint.config.mjs'], languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: { ...node, ...browser, ...Object.fromEntries(['window', 'document', 'navigator', 'location', 'localStorage', 'indexedDB'].map((n) => [n, 'readonly'])) } }, rules },
];
