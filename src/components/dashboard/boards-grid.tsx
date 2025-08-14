'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Board } from '@prisma/client'

interface BoardsGridProps {
    boards: (Board & {
        _count: {
            assets: number
        }
    })[]
}

export function BoardsGrid({ boards }: BoardsGridProps) {
    return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {boards.map((board) => (
                <Link
                    key={board.id}
                    href={`/dashboard/boards/${board.id}`}
                    className="group block"
                >
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                        {/* Board Preview */}
                        <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                            {board._count.assets > 0 ? (
                                <div className="text-center">
                                    <div className="w-12 h-12 mx-auto mb-2 bg-white rounded-lg shadow-sm flex items-center justify-center">
                                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <p className="text-xs text-gray-500">{board._count.assets} ads</p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="w-12 h-12 mx-auto mb-2 bg-white rounded-lg shadow-sm flex items-center justify-center">
                                        <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </div>
                                    <p className="text-xs text-gray-400">Empty board</p>
                                </div>
                            )}
                        </div>

                        {/* Board Info */}
                        <div className="p-4">
                            <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                                {board.name}
                            </h3>
                            {board.description && (
                                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                    {board.description}
                                </p>
                            )}
                            <div className="flex items-center justify-between mt-3">
                                <span className="text-xs text-gray-400">
                                    Updated {formatDistanceToNow(new Date(board.updatedAt), { addSuffix: true })}
                                </span>
                                <span className="text-xs text-gray-500">
                                    {board._count.assets} {board._count.assets === 1 ? 'ad' : 'ads'}
                                </span>
                            </div>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    )
}
