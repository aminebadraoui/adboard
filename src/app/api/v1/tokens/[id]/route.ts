import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Authenticate user via session (web app only)
        const authContext = await getAuthenticatedUser(req)
        if (!authContext) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { userId } = authContext
        const tokenId = params.id

        // Find and delete the token (only if it belongs to the user)
        const deletedToken = await prisma.accessToken.deleteMany({
            where: {
                id: tokenId,
                userId
            }
        })

        if (deletedToken.count === 0) {
            return NextResponse.json({ error: 'Token not found' }, { status: 404 })
        }

        return NextResponse.json({ message: 'Token deleted successfully' })

    } catch (error) {
        console.error('Error deleting access token:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}