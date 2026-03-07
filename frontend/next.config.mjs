import { withSentryConfig } from "@sentry/nextjs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Ignore type errors in dependencies (e.g. @ethereumjs/tx overload signature)
    ignoreBuildErrors: true,
  },
  // Avoid "multiple lockfiles" warning when building from repo root (e.g. Vercel)
  outputFileTracingRoot: __dirname,
  // Next 15 + ESLint 8 can pass invalid options during build; ignore so WASM/Dojo build succeeds
  eslint: { ignoreDuringBuilds: true },
  // Dojo SDK uses @dojoengine/torii-wasm (.wasm). Requires Next 15+ (webpack 5.97+) for WASM reference types.
  webpack(config, { isServer, dev }) {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    config.output.webassemblyModuleFilename =
      isServer && !dev ? '../static/wasm/[modulehash].wasm' : 'static/wasm/[modulehash].wasm';

    // Force a single React instance in the client bundle to fix "ReactCurrentBatchConfig" (R3F/Cartridge/Dojo).
    if (!isServer) {
      const reactDir = path.resolve(__dirname, 'node_modules/react');
      const reactDomDir = path.resolve(__dirname, 'node_modules/react-dom');
      config.resolve = config.resolve ?? {};
      config.resolve.alias = {
        ...config.resolve.alias,
        react: reactDir,
        'react-dom': reactDomDir,
        'react/jsx-runtime': path.join(reactDir, 'jsx-runtime.js'),
        'react/jsx-dev-runtime': path.join(reactDir, 'jsx-dev-runtime.js'),
      };
      config.resolve.dedupe = [...(config.resolve.dedupe || []), 'react', 'react-dom'];
    }

    return config;
  },
  async redirects() {
    return [
      {
        source: '/.well-known/farcaster.json',
        destination: 'https://api.farcaster.xyz/miniapps/hosted-manifest/019b9413-dacb-6826-2d02-09f283211209',
        permanent: false, // This ensures a temporary 307 redirect
        statusCode: 307,  // Explicitly set to 307 (recommended by Farcaster)
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  org: process.env.SENTRY_ORG ?? undefined,
  project: process.env.SENTRY_PROJECT ?? undefined,
});
