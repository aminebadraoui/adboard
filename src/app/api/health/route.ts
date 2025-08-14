import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
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

        return NextResponse.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: 'connected',
            environment: process.env.NODE_ENV
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