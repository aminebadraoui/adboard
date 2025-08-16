import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(request: Request) {
    try {
        // Check database connection
        await prisma.$queryRaw`SELECT 1`

        // Check if we can access environment variables
        const requiredEnvVars = [
            'DATABASE_URL',
            'NEXTAUTH_SECRET',
            'CLOUDINARY_CLOUD_NAME'
        ]

        const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])

        if (missingEnvVars.length > 0) {
            return NextResponse.json(
                {
                    status: 'unhealthy',
                    error: 'Missing environment variables',
                    missing: missingEnvVars
                },
                { status: 500 }
            )
        }

        // Check session validity if cookie is present
        const session = await auth()
        const hasValidSession = !!session

        console.log('🔍 Health check - Session info:', {
            hasSession: !!session,
            sessionUser: session?.user?.email,
            sessionUserId: session?.user?.id
        })

        return NextResponse.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: 'connected',
            environment: process.env.NODE_ENV,
            session: hasValidSession ? 'valid' : 'none',
            sessionDetails: hasValidSession ? {
                userEmail: session.user?.email,
                userId: session.user?.id
            } : null
        })
    } catch (error) {
        console.error('Health check failed:', error)

        return NextResponse.json(
            {
                status: 'unhealthy',
                error: 'Database connection failed',
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        )
    }
}

// POST method for testing session validation
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { testSession } = body

        if (testSession) {
            // Check session validity
            const session = await auth()
            const hasValidSession = !!session

            return NextResponse.json({
                test: 'session',
                hasValidSession,
                session: hasValidSession ? 'valid' : 'none',
                sessionDetails: hasValidSession ? {
                    userEmail: session.user?.email,
                    userId: session.user?.id
                } : null,
                cookies: request.headers.get('cookie') || 'none'
            })
        }

        return NextResponse.json({ error: 'Invalid test request' }, { status: 400 })
    } catch (error) {
        console.error('Session test failed:', error)
        return NextResponse.json({ error: 'Session test failed' }, { status: 500 })
    }
}