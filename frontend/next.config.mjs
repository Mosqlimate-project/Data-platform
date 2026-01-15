/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,

  experimental: {
    optimizePackageImports: ['@tanstack/react-query', 'axios'],
  },

  compress: true,

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            maxSize: 244000,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            enforce: true,
            maxSize: 244000,
          },
        },
      };
    }

    return config;
  },

  async redirects() {
    return [
      {
        source: "/docs",
        destination: "http://0.0.0.0:8043/docs/",
        permanent: false,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
