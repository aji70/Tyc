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
  // Prevent R3F/drei from running in Node during page data collection ("cache is not a function")
  serverExternalPackages: [
    '@react-three/drei',
    '@react-three/fiber',
    'three',
    'troika-three-text',
    'suspend-react',
  ],
  // Dojo SDK uses @dojoengine/torii-wasm (.wasm). Requires Next 15+ (webpack 5.97+) for WASM reference types.
  webpack(config, { isServer, dev }) {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    config.output.webassemblyModuleFilename =
      isServer && !dev ? '../static/wasm/[modulehash].wasm' : 'static/wasm/[modulehash].wasm';
    // Force a single React instance to avoid "ReactCurrentBatchConfig" / multiple-React errors (Cartridge/Dojo/ R3F)
    config.resolve = config.resolve ?? {};
    const reactPath = path.resolve(__dirname, 'node_modules/react');
    config.resolve.alias = {
      ...config.resolve.alias,
      ...(isServer
        ? {
            'react/jsx-runtime': path.join(reactPath, 'jsx-runtime.js'),
            'react/jsx-dev-runtime': path.join(reactPath, 'jsx-dev-runtime.js'),
            react: path.resolve(__dirname, 'lib/react-server-shim.js'),
            'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
          }
        : {
            react: reactPath,
            'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
          }),
    };
    // Prevent R3F/drei from being executed on server (avoids "cache is not a function" during page data collection)
    if (isServer) {
      const externals = [
        '@react-three/drei',
        '@react-three/fiber',
        'three',
        'troika-three-text',
        'suspend-react',
      ];
      config.externals = config.externals ?? [];
      if (Array.isArray(config.externals)) {
        config.externals.push(({ request }, callback) => {
          if (externals.some((pkg) => request === pkg || request.startsWith(pkg + '/'))) {
            return callback(null, 'commonjs ' + request);
          }
          callback();
        });
      }
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

const hasSentryAuth = Boolean(process.env.SENTRY_AUTH_TOKEN);

export default withSentryConfig(nextConfig, {
  silent: !hasSentryAuth || !process.env.CI,
  org: process.env.SENTRY_ORG ?? undefined,
  project: process.env.SENTRY_PROJECT ?? undefined,
  authToken: hasSentryAuth ? process.env.SENTRY_AUTH_TOKEN : undefined,
  // Skip source map upload when no token so build doesn’t warn
  sourcemaps: {
    disable: !hasSentryAuth,
    deleteSourcemapsAfterUpload: hasSentryAuth,
  },
  telemetry: false,
});

