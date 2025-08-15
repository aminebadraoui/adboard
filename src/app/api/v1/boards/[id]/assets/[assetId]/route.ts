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

        // Check if asset is still used on other boards
        const remainingBoardAssets = await prisma.boardAsset.findMany({
            where: {
                assetId: assetId,
            },
        })

        console.log(`🗑️ Asset ${assetId} is on ${remainingBoardAssets.length} other boards`)

        let auditAction = 'ASSET_REMOVED_FROM_BOARD'

        // If asset is not used anywhere else, delete it completely
        if (remainingBoardAssets.length === 0) {
            console.log(`🗑️ Deleting asset ${assetId} completely (not used on any other boards)`)

            // Delete in correct order to avoid foreign key constraints

            // 1. Delete ALL audit logs referencing this asset first
            await prisma.auditLog.deleteMany({
                where: {
                    resource: 'ASSET',
                    resourceId: assetId
                }
            })

            // 2. Delete asset files
            await prisma.assetFile.deleteMany({
                where: { assetId }
            })

            // 3. Delete asset tags
            await prisma.assetTag.deleteMany({
                where: { assetId }
            })

            // 4. Delete the asset itself
            await prisma.asset.delete({
                where: { id: assetId }
            })

            console.log(`✅ Asset ${assetId} deleted completely`)
        } else {
            // Only log audit for removal from board (not complete deletion)
            try {
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
                            action: 'removed_from_board',
                            remainingBoards: remainingBoardAssets.length
                        }
                    }
                })
            } catch (auditError) {
                console.error('Failed to create audit log (non-critical):', auditError)
            }
        }

        return NextResponse.json({
            message: 'Asset removed from board successfully'
        })

    } catch (error) {
        console.error('Error removing asset from board:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
