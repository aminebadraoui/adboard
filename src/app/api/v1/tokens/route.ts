import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

const createTokenSchema = z.object({
    name: z.string().min(1).max(100),
    expiresAt: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
    try {
        // Authenticate user via session (web app only)
        const authContext = await getAuthenticatedUser(req)
        if (!authContext) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { userId } = authContext

        // Get user's access tokens
        const tokens = await prisma.accessToken.findMany({
            where: { userId },
            select: {
                id: true,
                name: true,
                lastUsed: true,
                createdAt: true,
                expiresAt: true,
                // Don't return the actual token for security
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ tokens })

    } catch (error) {
        console.error('Error fetching access tokens:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        // Authenticate user via session (web app only)
        const authContext = await getAuthenticatedUser(req)
        if (!authContext) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { userId } = authContext

        // Parse request body
        const body = await req.json()
        const { name, expiresAt } = createTokenSchema.parse(body)

        // Generate secure token
        const token = crypto.randomBytes(32).toString('hex')

        // Parse expiration date
        let expirationDate: Date | null = null
        if (expiresAt) {
            expirationDate = new Date(expiresAt)

            // Validate expiration date
            if (expirationDate <= new Date()) {
                return NextResponse.json({ error: 'Expiration date must be in the future' }, { status: 400 })
            }
        }

        // Create access token
        const accessToken = await prisma.accessToken.create({
            data: {
                name,
                token,
                userId,
                expiresAt: expirationDate,
            },
            select: {
                id: true,
                name: true,
                token: true, // Only return token on creation
                createdAt: true,
                expiresAt: true,
            }
        })

        return NextResponse.json({
            ...accessToken,
            message: 'Token created successfully. Save this token securely - you won\'t be able to see it again.'
        })

    } catch (error) {
        console.error('Error creating access token:', error)

        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
        }

        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}