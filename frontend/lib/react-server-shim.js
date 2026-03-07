/**
 * Server-only React shim: re-exports React and adds React.cache when missing.
 * Next.js 15 use-cache and some R3F/drei code paths call React.cache(); React 18 doesn't export it.
 * Uses a relative require so webpack resolves the real React at build time (works on Vercel).
 */
// Relative to frontend/lib/ -> frontend/node_modules/react (resolved at build time)
const React = require('../node_modules/react');

if (typeof React.cache !== 'function') {
  React.cache = (fn) => fn;
}

module.exports = React;
