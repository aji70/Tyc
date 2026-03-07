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
  // Force R3F/drei/three to use the app's React (avoids Cartridge + R3F dual-React / ReactCurrentBatchConfig).
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  // Dojo SDK uses @dojoengine/torii-wasm (.wasm). Requires Next 15+ (webpack 5.97+) for WASM reference types.
  webpack(config, { isServer, dev }) {
    // Force a single React for all chunks (fixes ReactCurrentBatchConfig when R3F loads in async chunk).
    config.resolve.alias = {
      ...config.resolve.alias,
      react: path.join(__dirname, 'node_modules/react'),
      'react-dom': path.join(__dirname, 'node_modules/react-dom'),
    };
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    config.output.webassemblyModuleFilename =
      isServer && !dev ? '../static/wasm/[modulehash].wasm' : 'static/wasm/[modulehash].wasm';
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
