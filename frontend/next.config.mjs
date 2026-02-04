export const BACKEND_PORT = process.env.BACKEND_PORT;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  output: 'standalone',

  experimental: {
    optimizePackageImports: [
      '@tanstack/react-query',
      'axios',
      'lucide-react',
      'date-fns',
      'lodash'
    ],
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
        destination: "https://api.mosqlimate.org/docs/",
        permanent: false,
      },
      {
        source: "/contaovos",
        destination: "https://contaovos.com/pt-br/",
        permanent: false,
      },
      {
        source: "/IMDC",
        destination: "https://sprint.mosqlimate.org/",
        permanent: false,
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: '/media/:path*',
        destination: `http://backend:${BACKEND_PORT}/media/:path*`,
      },
    ]
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
