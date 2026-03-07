/**
 * Server-only React shim: re-exports React and adds React.cache when missing.
 * Next.js 15 use-cache and some R3F/drei code paths call React.cache(); React 18 doesn't export it.
 * We require the real React from the project's node_modules (by path) so we don't get the shim again.
 * Tries several locations so it works locally, in CI, and on Vercel (monorepo or app in subdir).
 */
const path = require('path');
const fs = require('fs');

const cwd = process.cwd();
const candidates = [
  path.join(cwd, 'node_modules/react'),
  path.join(cwd, 'frontend/node_modules/react'),
  path.join(cwd, '..', 'node_modules/react'),
  path.join(cwd, '..', '..', 'node_modules/react'),
];
let React;
for (const reactPath of candidates) {
  if (!fs.existsSync(reactPath)) continue;
  try {
    React = require(reactPath);
    break;
  } catch (_) {
    continue;
  }
}
if (!React) {
  throw new Error(
    `[react-server-shim] Could not load react from any of: ${candidates.join(', ')} (cwd: ${cwd})`
  );
}

if (typeof React.cache !== 'function') {
  React.cache = (fn) => fn;
}

module.exports = React;
