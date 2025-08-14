import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; assetId: string }> }
) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id: boardId, assetId } = await params

        // Verify user has access to the board
        const board = await prisma.board.findFirst({
            where: {
                id: boardId,
                org: {
                    memberships: {
                        some: {
                            userId: session.user.id,
                        },
                    },
                },
            },
        })

        if (!board) {
            return NextResponse.json({ error: 'Board not found or unauthorized' }, { status: 404 })
        }

        // Check if the asset is actually on this board
        const boardAsset = await prisma.boardAsset.findFirst({
            where: {
                boardId,
                assetId,
            },
        })

        if (!boardAsset) {
            return NextResponse.json({ error: 'Asset not found on this board' }, { status: 404 })
        }

        // Remove the asset from the board
        await prisma.boardAsset.delete({
            where: {
                id: boardAsset.id,
            },
        })

        // Log audit event (use the asset ID since that still exists)
        await prisma.auditLog.create({
            data: {
                action: 'ASSET_REMOVED_FROM_BOARD',
                resource: 'ASSET',
                resourceId: assetId,
                userId: session.user.id,
                orgId: board.orgId,
                metadata: {
                    boardId,
                    boardName: board.name,
                    action: 'removed_from_board'
                }
            }
        })

        return NextResponse.json({
            message: 'Asset removed from board successfully'
        })

    } catch (error) {
        console.error('Error removing asset from board:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
