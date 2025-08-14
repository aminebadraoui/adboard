import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateBoardSchema = z.object({
    name: z.string().min(1, 'Board name is required').max(255, 'Board name too long').optional(),
    description: z.string().max(1000, 'Description too long').nullable().optional(),
    color: z.string().max(7, 'Color too long').nullable().optional(),
})

// GET /api/v1/boards/[id] - Get a specific board
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const board = await prisma.board.findFirst({
            where: {
                id: params.id,
                org: {
                    memberships: {
                        some: {
                            userId: session.user.id,
                        },
                    },
                },
            },
            include: {
                assets: {
                    include: {
                        asset: {
                            include: {
                                files: true,
                                tags: {
                                    include: {
                                        tag: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: {
                        order: 'asc',
                    },
                },
                _count: {
                    select: {
                        assets: true,
                    },
                },
            },
        })

        if (!board) {
            return NextResponse.json({ error: 'Board not found' }, { status: 404 })
        }

        return NextResponse.json(board)
    } catch (error) {
        console.error('Error fetching board:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// PATCH /api/v1/boards/[id] - Update a board
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const updates = updateBoardSchema.parse(body)

        // Verify board access
        const existingBoard = await prisma.board.findFirst({
            where: {
                id: params.id,
                org: {
                    memberships: {
                        some: {
                            userId: session.user.id,
                        },
                    },
                },
            },
        })

        if (!existingBoard) {
            return NextResponse.json({ error: 'Board not found' }, { status: 404 })
        }

        const updatedBoard = await prisma.board.update({
            where: {
                id: params.id,
            },
            data: updates,
            include: {
                _count: {
                    select: {
                        assets: true,
                    },
                },
            },
        })

        return NextResponse.json(updatedBoard)
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
        }

        console.error('Error updating board:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// DELETE /api/v1/boards/[id] - Delete a board
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify board access
        const existingBoard = await prisma.board.findFirst({
            where: {
                id: params.id,
                org: {
                    memberships: {
                        some: {
                            userId: session.user.id,
                        },
                    },
                },
            },
        })

        if (!existingBoard) {
            return NextResponse.json({ error: 'Board not found' }, { status: 404 })
        }

        await prisma.board.delete({
            where: {
                id: params.id,
            },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting board:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
