'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Board } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Edit2,
    Share2,
    MoreHorizontal,
    Trash2,
    Settings,
    ArrowLeft
} from 'lucide-react'

interface BoardHeaderProps {
    board: Board & {
        _count: {
            assets: number
        }
    }
}

export function BoardHeader({ board }: BoardHeaderProps) {
    const router = useRouter()
    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(board.name)
    const [editDescription, setEditDescription] = useState(board.description || '')
    const [isLoading, setIsLoading] = useState(false)

    const handleSave = async () => {
        if (!editName.trim()) return

        setIsLoading(true)
        try {
            const response = await fetch(`/api/v1/boards/${board.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: editName.trim(),
                    description: editDescription.trim() || null,
                }),
            })

            if (response.ok) {
                setIsEditing(false)
                router.refresh()
            } else {
                console.error('Failed to update board')
            }
        } catch (error) {
            console.error('Error updating board:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleCancel = () => {
        setEditName(board.name)
        setEditDescription(board.description || '')
        setIsEditing(false)
    }

    return (
        <div className="bg-white border-b border-gray-200 pb-6">
            {/* Back Navigation */}
            <div className="mb-4">
                <Button
                    variant="ghost"
                    onClick={() => router.push('/dashboard')}
                    className="text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Boards
                </Button>
            </div>

            {/* Board Info */}
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    {isEditing ? (
                        <div className="space-y-4 max-w-2xl">
                            <div>
                                <label htmlFor="board-name" className="block text-sm font-medium text-gray-700 mb-1">
                                    Board Name
                                </label>
                                <Input
                                    id="board-name"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Board name"
                                    disabled={isLoading}
                                />
                            </div>
                            <div>
                                <label htmlFor="board-description" className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    id="board-description"
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    placeholder="Describe this board..."
                                    rows={3}
                                    disabled={isLoading}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="flex gap-3">
                                <Button onClick={handleSave} disabled={isLoading || !editName.trim()}>
                                    {isLoading ? 'Saving...' : 'Save'}
                                </Button>
                                <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-2xl font-bold text-gray-900 truncate">
                                    {board.name}
                                </h1>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsEditing(true)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </Button>
                            </div>
                            {board.description && (
                                <p className="text-gray-600 mb-3">{board.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span>{board._count.assets} {board._count.assets === 1 ? 'ad' : 'ads'}</span>
                                <span>•</span>
                                <span>Updated {formatDistanceToNow(new Date(board.updatedAt), { addSuffix: true })}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                {!isEditing && (
                    <div className="flex items-center gap-2 ml-4">
                        <Button variant="outline" size="sm">
                            <Share2 className="w-4 h-4 mr-2" />
                            Share
                        </Button>
                        <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
