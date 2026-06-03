import type { NextConfig } from 'next';
import path from 'node:path';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const workspaceRoot = path.resolve(process.cwd(), '../..');

// Orígenes del casino autorizados a embeber Prode (coma-separados).
const parentOrigins = (process.env.NEXT_PUBLIC_PARENT_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const frameAncestors = parentOrigins.length ? parentOrigins.join(' ') : "'none'";

const nextConfig: NextConfig = {
  outputFileTracingRoot: workspaceRoot,
  turbopack: {
    root: workspaceRoot,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'flagcdn.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'media.api-sports.io' },
    ],
  },
  transpilePackages: ['@prode/shared'],
  async headers() {
    return [
      {
        // La app de usuario es embebible por los orígenes del casino.
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `frame-ancestors ${frameAncestors};`,
          },
        ],
      },
      {
        // El panel admin NO debe ser embebible.
        source: '/admin/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none';" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
