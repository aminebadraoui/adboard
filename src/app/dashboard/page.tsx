import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BoardsGrid } from '@/components/dashboard/boards-grid'
import { CreateBoardDialog } from '@/components/dashboard/create-board-dialog'
import { AddAdDialog } from '@/components/dashboard/add-ad-dialog'

export default async function DashboardPage() {
    const session = await auth()

    // Fetch user's boards through organization membership
    const boards = await prisma.board.findMany({
        where: {
            org: {
                memberships: {
                    some: {
                        userId: session?.user?.id,
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
        take: 12, // Show up to 12 recent boards
    })

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Boards</h1>
                    <p className="text-gray-600">Create and organize Facebook ad mood boards</p>
                </div>
                <div className="flex gap-3">
                    <AddAdDialog />
                    <CreateBoardDialog />
                </div>
            </div>

            {/* Boards Grid */}
            {boards.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No boards yet</h3>
                    <p className="text-gray-500 mb-6">Create your first mood board to start collecting Facebook ads</p>
                    <CreateBoardDialog />
                </div>
            ) : (
                <BoardsGrid boards={boards} />
            )}
        </div>
    )
}