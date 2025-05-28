/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  typescript: {
    // Type checking is handled by the CI/CD pipeline
    ignoreBuildErrors: false,
  },
  eslint: {
    // ESLint is handled by the CI/CD pipeline
    ignoreDuringBuilds: false,
  },
  images: {
    domains: [
      'localhost',
      // Add Azure Blob Storage domain when configured
      // 'intellifinstorage.blob.core.windows.net'
    ],
    formats: ['image/webp', 'image/avif'],
  },
  env: {
    NEXT_PUBLIC_APP_NAME: 'IntelliFin',
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version,
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  // Redirect configuration for authentication
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
        has: [
          {
            type: 'cookie',
            key: 'auth-token',
          },
        ],
      },
      {
        source: '/',
        destination: '/auth/login',
        permanent: false,
        missing: [
          {
            type: 'cookie',
            key: 'auth-token',
          },
        ],
      },
    ];
  },
  // Webpack configuration for optimizations
  webpack: (config, { dev, isServer }) => {
    // Optimize bundle size in production
    if (!dev && !isServer) {
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      };
    }

    return config;
  },
  // Performance optimizations for low-bandwidth conditions
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  
  // Output configuration for deployment
  output: 'standalone',
  
  // Internationalization (future enhancement)
  i18n: {
    locales: ['en', 'ny', 'bem'], // English, Chichewa, Bemba
    defaultLocale: 'en',
  },
};

module.exports = nextConfig;
