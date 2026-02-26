/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/:path*`,
      },
      {
        source: '/sse',
        destination: `${process.env.BACKEND_URL || 'http://localhost:3000'}/sse`,
      },
    ];
  },
};

export default nextConfig;
