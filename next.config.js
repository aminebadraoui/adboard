/** @type {import('next').NextConfig} */
const nextConfig = {
    // No need for standalone output with Coolify direct deployment
    // output: 'standalone',

    // Image optimization configuration
    images: {
        domains: ['res.cloudinary.com', 'scontent.facebook.com', 'external.facebook.com'],
        formats: ['image/webp', 'image/avif'],
        minimumCacheTTL: 86400, // 24 hours
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
        ]
    },

    // API configuration
    async rewrites() {
        return [
            {
                source: '/health',
                destination: '/api/health',
            },
        ]
    },

      // External packages for server components
  serverExternalPackages: ['@prisma/client'],

    // Environment variables validation
    env: {
        CUSTOM_KEY: process.env.CUSTOM_KEY,
    },
}

module.exports = nextConfig