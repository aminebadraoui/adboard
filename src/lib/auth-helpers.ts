import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { User } from '@prisma/client'

export interface AuthContext {
    user: User
    userId: string
}

// Get user from NextAuth session
export async function getUserFromSession(req: NextRequest): Promise<AuthContext | null> {
  try {
    const session = await auth()

        if (!session?.user?.id) {
            return null
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        })

        if (!user) {
            return null
        }

        return {
            user,
            userId: user.id
        }
    } catch (error) {
        console.error('Error getting user from session:', error)
        return null
    }
}

// Get user from personal access token
export async function getUserFromToken(req: NextRequest): Promise<AuthContext | null> {
    try {
        const authHeader = req.headers.get('Authorization')

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null
        }

        const token = authHeader.substring(7)

        const accessToken = await prisma.accessToken.findUnique({
            where: { token },
            include: { user: true }
        })

        if (!accessToken || (accessToken.expiresAt && accessToken.expiresAt < new Date())) {
            return null
        }

        // Update last used timestamp
        await prisma.accessToken.update({
            where: { id: accessToken.id },
            data: { lastUsed: new Date() }
        })

        return {
            user: accessToken.user,
            userId: accessToken.user.id
        }
    } catch (error) {
        console.error('Error getting user from token:', error)
        return null
    }
}

// Get authenticated user from either session or token
export async function getAuthenticatedUser(req: NextRequest): Promise<AuthContext | null> {
    // Try session first (for web app)
    const sessionAuth = await getUserFromSession(req)
    if (sessionAuth) {
        return sessionAuth
    }

    // Try token auth (for extension)
    const tokenAuth = await getUserFromToken(req)
    if (tokenAuth) {
        return tokenAuth
    }

    return null
}

// Check if user has access to organization
export async function checkOrgAccess(userId: string, orgId: string): Promise<boolean> {
    try {
        const membership = await prisma.membership.findUnique({
            where: {
                userId_orgId: {
                    userId,
                    orgId
                }
            }
        })

        return !!membership
    } catch {
        return false
    }
}

// Get user's default organization or create one
export async function getOrCreateDefaultOrg(userId: string): Promise<string> {
    try {
        // First, try to find an existing membership
        const membership = await prisma.membership.findFirst({
            where: { userId },
            include: { org: true },
            orderBy: { org: { createdAt: 'asc' } }
        })

        if (membership) {
            return membership.orgId
        }

        // If no membership exists, create a new organization
        const user = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (!user) {
            throw new Error('User not found')
        }

        const orgName = user.name ? `${user.name}'s Workspace` : 'My Workspace'
        const orgSlug = `user-${userId}-${Date.now()}`

        const org = await prisma.organization.create({
            data: {
                name: orgName,
                slug: orgSlug,
                memberships: {
                    create: {
                        userId,
                        role: 'OWNER'
                    }
                },
                boards: {
                    create: {
                        name: 'My First Board',
                        description: 'Your default board for saving ads',
                        isDefault: true,
                        color: '#3B82F6'
                    }
                }
            }
        })

        return org.id
    } catch (error) {
        console.error('Error getting or creating default org:', error)
        throw new Error('Failed to get or create organization')
    }
}