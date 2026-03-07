/**
 * Server-only React shim: re-exports React and adds React.cache when missing.
 * Next.js 15 use-cache and some R3F/drei code paths call React.cache(), which
 * is not exported in React 18. This shim provides a no-op cache so server build
 * and page data collection succeed.
 */
const React = require('react');

const cache =
  typeof React.cache === 'function'
    ? React.cache
    : (fn) => fn;

module.exports = { ...React, cache };
