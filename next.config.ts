import type { NextConfig } from 'next';

// Product images come from the WooCommerce host. Allow exactly that host for next/image.
// LocalWP (http://*.local / localhost) resolves to a private IP, which the image optimiser refuses,
// so in that case images are served unoptimised (see README, "LocalWP quirks").
function wooImages(): NextConfig['images'] {
  const raw = process.env.WOO_URL;
  if (!raw) return { remotePatterns: [] };
  try {
    const u = new URL(raw);
    const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(u.hostname) || u.hostname.endsWith('.local');
    return {
      unoptimized: local,
      remotePatterns: [{ protocol: u.protocol.replace(':', '') as 'http' | 'https', hostname: u.hostname, port: u.port, pathname: '/**' }],
    };
  } catch {
    return { remotePatterns: [] };
  }
}

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com" "https://api.razorpay.com")' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: wooImages(),
  async rewrites() {
    // The earlier Three.js product-viewer prototype, kept as a static file.
    return [{ source: '/3d', destination: '/3d.html' }];
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/frames/:file*', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }] },
    ];
  },
};

export default nextConfig;
