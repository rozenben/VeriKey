/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'standalone' is for Docker only — Vercel uses default output
  // output: 'standalone',
  async headers() {
    return [
      {
        source: '/apple-app-site-association',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
    ];
  },
};
module.exports = nextConfig;
