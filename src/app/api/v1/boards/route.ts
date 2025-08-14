import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createBoardSchema = z.object({
    name: z.string().min(1, 'Board name is required').max(255, 'Board name too long'),
    description: z.string().max(1000, 'Description too long').optional(),
})

// GET /api/v1/boards - List user's boards
export async function GET(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
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
                            userId: session.user.id,
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

        return NextResponse.json({ boards })
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

        if (!userOrg) {
            // Create personal organization for the user
            userOrg = await prisma.organization.create({
                data: {
                    name: `${session.user.email || 'User'}'s Organization`,
                    memberships: {
                        create: {
                            userId: session.user.id,
                            role: 'OWNER',
                        },
                    },
                },
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

        return NextResponse.json(board, { status: 201 })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
        }

        console.error('Error creating board:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
