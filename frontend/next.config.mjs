export const BACKEND_PORT = process.env.BACKEND_PORT;

const legacyRedirects = [
  // Old MkDocs i18n pages: /pt is not a locale prefix in this app anymore.
  { source: "/pt/team", destination: "/about", permanent: true },
  { source: "/pt/team/:path*", destination: "/about", permanent: true },
  { source: "/pt/products", destination: "/models", permanent: true },
  { source: "/pt/products/:path*", destination: "/models", permanent: true },
  { source: "/pt/egg-dataset", destination: "/datastore", permanent: true },
  { source: "/pt/egg-dataset/:path*", destination: "/datastore", permanent: true },
  { source: "/pt", destination: "/", permanent: true },
  { source: "/pt/:path*", destination: "/", permanent: true },
  // Old default-language (unprefixed) pages.
  { source: "/team", destination: "/about", permanent: true },
  { source: "/products", destination: "/models", permanent: true },
  { source: "/egg-dataset", destination: "/datastore", permanent: true },
  { source: "/feed", destination: "/publications", permanent: true },
];

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

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'secure.gravatar.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'gitlab.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        port: '',
        pathname: '/**',
      }
    ],
  },

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
      ...legacyRedirects,
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
