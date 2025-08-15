import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
    // Handle CORS for API routes
    if (request.nextUrl.pathname.startsWith('/api/')) {
        const response = NextResponse.next()

        // Get the origin from the request
        const origin = request.headers.get('origin')

        // Allow requests from Facebook (for Chrome extension) and localhost
        const allowedOrigins = [
            'https://www.facebook.com',
            'https://facebook.com',
            'http://localhost:3000',
            'http://localhost:3001',
            'chrome-extension://*' // Allow any Chrome extension
        ]

        // Check if origin is allowed or if it's a Chrome extension
        const isAllowed = origin && (
            allowedOrigins.includes(origin) ||
            origin.startsWith('chrome-extension://')
        )

        if (isAllowed || !origin) {
            response.headers.set('Access-Control-Allow-Origin', origin || '*')
            response.headers.set('Access-Control-Allow-Credentials', 'true')
            response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-Requested-With')
        }

        // Handle preflight requests
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 200,
                headers: response.headers
            })
        }

        return response
    }

    return NextResponse.next()
}

export const config = {
    matcher: '/api/:path*'
}
