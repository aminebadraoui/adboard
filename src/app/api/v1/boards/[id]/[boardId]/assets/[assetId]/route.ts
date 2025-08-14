import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
    params: Promise<{
        boardId: string
        assetId: string
    }>
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
    try {
        const { boardId, assetId } = await params
        console.log('DELETE request:', { boardId, assetId })

        // Check authentication
        const session = await auth()
        console.log('Session:', !!session, 'User ID:', session?.user?.id)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const user = session.user

        // Verify the user has access to this board
        const board = await prisma.board.findFirst({
            where: {
                id: boardId,
                org: {
                    memberships: {
                        some: {
                            userId: user.id
                        }
                    }
                }
            }
        })
        console.log('Board found:', !!board)

        if (!board) {
            return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
        }

        // Check if the asset is actually on this board
        const boardAsset = await prisma.boardAsset.findFirst({
            where: {
                boardId: boardId,
                assetId: assetId
            }
        })
        console.log('BoardAsset found:', !!boardAsset)

        if (!boardAsset) {
            return NextResponse.json({ error: 'Asset not found on this board' }, { status: 404 })
        }

        // Remove the asset from the board (but keep the asset itself)
        await prisma.boardAsset.delete({
            where: {
                id: boardAsset.id
            }
        })
        console.log('BoardAsset deleted successfully')

        // Log the removal (make this optional in case it fails)
        try {
            await prisma.auditLog.create({
                data: {
                    action: 'ASSET_REMOVED_FROM_BOARD',
                    userId: user.id,
                    orgId: board.orgId,
                    metadata: {
                        boardId: boardId,
                        assetId: assetId,
                        boardName: board.name
                    }
                }
            })
            console.log('Audit log created successfully')
        } catch (auditError) {
            console.error('Failed to create audit log (non-critical):', auditError)
            // Don't fail the whole operation if audit logging fails
        }

        return NextResponse.json({ message: 'Asset removed from board successfully' })

    } catch (error) {
        console.error('Error removing asset from board:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
