import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
    const origin = request.headers.get('origin')

    const response = new NextResponse(null, { status: 200 })

    if (origin && (origin.includes('facebook.com') || origin.startsWith('chrome-extension://'))) {
        response.headers.set('Access-Control-Allow-Origin', origin)
        response.headers.set('Access-Control-Allow-Credentials', 'true')
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-Requested-With')
    }

    return response
}

const createBoardSchema = z.object({
    name: z.string().min(1, 'Board name is required').max(255, 'Board name too long'),
    description: z.string().max(1000, 'Description too long').optional(),
})

// GET /api/v1/boards - List user's boards
export async function GET(request: NextRequest) {
    try {
        console.log('🔍 BOARDS API: Request headers:', {
            cookie: request.headers.get('cookie'),
            origin: request.headers.get('origin'),
            'user-agent': request.headers.get('user-agent')
        })

        const session = await auth()
        console.log('🔍 BOARDS API: Session result:', session ? 'Found session' : 'No session', session?.user?.id)

        // If no session from NextAuth, try to manually validate the session token for Chrome extension
        let userId = session?.user?.id

        if (!userId) {
            console.log('🔍 BOARDS API: No session from NextAuth, trying manual session validation...')
            const cookieHeader = request.headers.get('cookie')
            if (cookieHeader) {
                const sessionTokenMatch = cookieHeader.match(/authjs\.session-token=([^;]+)/)
                if (sessionTokenMatch) {
                    const sessionToken = sessionTokenMatch[1]
                    console.log('🔍 BOARDS API: Found session token, looking up in database...')

                    try {
                        const dbSession = await prisma.session.findUnique({
                            where: { sessionToken },
                            include: { user: true }
                        })

                        if (dbSession && dbSession.expires > new Date()) {
                            userId = dbSession.user.id
                            console.log('🎯 BOARDS API: Found valid session in database for user:', userId)
                        } else {
                            console.log('🚨 BOARDS API: Session token invalid or expired')
                        }
                    } catch (error) {
                        console.error('🚨 BOARDS API: Error looking up session:', error)
                    }
                }
            }
        }

        if (!userId) {
            console.log('🚨 BOARDS API: Unauthorized - no valid session found')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
        const offset = parseInt(searchParams.get('offset') || '0')

        const boards = await prisma.board.findMany({
            where: {
                org: {
                    memberships: {
                        some: {
                            userId: userId,
                        },
                    },
                },
            },
            include: {
                _count: {
                    select: {
                        assets: true,
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
            take: limit,
            skip: offset,
        })

        const response = NextResponse.json({ boards })

        // Add CORS headers for Chrome extension
        const origin = request.headers.get('origin')
        if (origin && (origin.includes('facebook.com') || origin.startsWith('chrome-extension://'))) {
            response.headers.set('Access-Control-Allow-Origin', origin)
            response.headers.set('Access-Control-Allow-Credentials', 'true')
        }

        return response
    } catch (error) {
        console.error('Error fetching boards:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST /api/v1/boards - Create a new board
export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { name, description } = createBoardSchema.parse(body)

        // Get or create user's organization
        let userOrg = await prisma.organization.findFirst({
            where: {
                memberships: {
                    some: {
                        userId: session.user.id,
                        role: 'OWNER',
                    },
                },
            },
        })

        console.log('🎯 BOARDS API: Organization lookup result:', {
            userId: session.user.id,
            foundOrg: !!userOrg,
            orgId: userOrg?.id,
            orgName: userOrg?.name
        })

        if (!userOrg) {
            // Create personal organization for the user
            const user = await prisma.user.findUnique({
                where: { id: session.user.id }
            })

            if (!user) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 })
            }

            const orgName = user.name ? `${user.name}'s Organization` : `${session.user.email || 'User'}'s Organization`
            const orgSlug = `user-${session.user.id}-${Date.now()}`

            console.log('🎯 BOARDS API: Creating new organization:', {
                userId: session.user.id,
                orgName,
                orgSlug
            })

            userOrg = await prisma.organization.create({
                data: {
                    name: orgName,
                    slug: orgSlug,
                    memberships: {
                        create: {
                            userId: session.user.id,
                            role: 'OWNER',
                        },
                    },
                },
            })

            console.log('✅ BOARDS API: Organization created successfully:', {
                orgId: userOrg.id,
                orgName: userOrg.name,
                orgSlug: userOrg.slug
            })
        }

        const board = await prisma.board.create({
            data: {
                name,
                description,
                orgId: userOrg.id,
            },
            include: {
                _count: {
                    select: {
                        assets: true,
                    },
                },
            },
        })

        console.log('✅ BOARDS API: Board created successfully:', {
            boardId: board.id,
            boardName: board.name,
            orgId: board.orgId,
            assetCount: board._count.assets
        })

        return NextResponse.json(board, { status: 201 })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
        }

        console.error('Error creating board:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
