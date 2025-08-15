import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BoardHeader } from '@/components/boards/board-header'
import { BoardGrid } from '@/components/boards/board-grid'
import { AddAdToBoard } from '@/components/boards/add-ad-to-board'

interface BoardPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function BoardPage({ params }: BoardPageProps) {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) {
        notFound()
    }

    // Fetch the board with access control
    const board = await prisma.board.findFirst({
        where: {
            id: id,
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
        notFound()
    }

    return (
        <div className="space-y-6">
            {/* Board Header */}
            <BoardHeader board={board} />

            {/* Add Ad Action */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-medium text-gray-900">
                        Ads ({board._count.assets})
                    </h2>
                    <p className="text-sm text-gray-600">
                        Collect and organize Facebook ads for inspiration
                    </p>
                </div>
                <AddAdToBoard boardId={board.id} />
            </div>

            {/* Board Content */}
            {board.assets.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-24 h-24 mx-auto mb-4 bg-white border border-gray-200 rounded-xl flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No ads yet</h3>
                    <p className="text-gray-600 mb-6">Start building your mood board by adding Facebook ads</p>
                    <AddAdToBoard boardId={board.id} />
                </div>
            ) : (
                <BoardGrid board={board} />
            )}
        </div>
    )
}

// Generate metadata for the page
export async function generateMetadata({ params }: BoardPageProps) {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) {
        return {
            title: 'Board Not Found',
        }
    }

    const board = await prisma.board.findFirst({
        where: {
            id: id,
            org: {
                memberships: {
                    some: {
                        userId: session.user.id,
                    },
                },
            },
        },
        select: {
            name: true,
            description: true,
        },
    })

    if (!board) {
        return {
            title: 'Board Not Found',
        }
    }

    return {
        title: `${board.name} - AdBoard`,
        description: board.description || `View and manage ads in ${board.name}`,
    }
}
