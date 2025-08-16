'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
    LayoutDashboard,
    Layers,
    Tag,
    Share2,
    FileText,
    Plus,
    ChevronDown,
    ChevronRight,
    Settings,
    Folder
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Board {
    id: string
    name: string
    description: string | null
    createdAt: string
}

const navigation = [
    { name: 'My Boards', href: '/dashboard', icon: Folder },
    { name: 'All Ads', href: '/dashboard/ads', icon: Layers },
    { name: 'Tags', href: '/dashboard/tags', icon: Tag },
    { name: 'Shared Links', href: '/dashboard/shared', icon: Share2 },
    { name: 'Briefs', href: '/dashboard/briefs', icon: FileText },
]

const settingsNavigation = [
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar() {
    const pathname = usePathname()
    const [boardsExpanded, setBoardsExpanded] = useState(true)
    const [boards, setBoards] = useState<Board[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchBoards = async () => {
            try {
                const response = await fetch('/api/v1/boards')
                if (response.ok) {
                    const data = await response.json()
                    setBoards(data.boards || [])
                }
            } catch (error) {
                console.error('Failed to fetch boards:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchBoards()
    }, [])

    return (
        <aside className="w-64 bg-gray-900 border-r border-gray-700 min-h-[calc(100vh-73px)]">
            <div className="p-4">
                {/* Main Navigation */}
                <nav className="space-y-1">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                                    isActive
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                )}
                            >
                                <item.icon className={cn(
                                    'mr-3 h-4 w-4',
                                    isActive ? 'text-white' : 'text-gray-400'
                                )} />
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>

                {/* Boards Section */}
                <div className="mt-8">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setBoardsExpanded(!boardsExpanded)}
                            className="flex items-center text-sm font-medium text-gray-300 hover:text-white"
                        >
                            {boardsExpanded ? (
                                <ChevronDown className="mr-1 h-4 w-4" />
                            ) : (
                                <ChevronRight className="mr-1 h-4 w-4" />
                            )}
                            Boards
                        </button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white hover:bg-gray-800">
                            <Plus className="h-3 w-3" />
                        </Button>
                    </div>

                    {boardsExpanded && (
                        <div className="mt-2 space-y-1">
                            {loading ? (
                                <div className="ml-4 text-gray-400 text-sm">Loading...</div>
                            ) : boards.length > 0 ? (
                                boards.map((board) => {
                                    const isActive = pathname === `/dashboard/boards/${board.id}`
                                    return (
                                        <Link
                                            key={board.id}
                                            href={`/dashboard/boards/${board.id}`}
                                            className={cn(
                                                'flex items-center px-3 py-2 text-sm rounded-md transition-colors ml-4',
                                                isActive
                                                    ? 'bg-blue-600 text-white'
                                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                            )}
                                        >
                                            <div className="mr-3 h-3 w-3 rounded-full bg-blue-500" />
                                            {board.name}
                                        </Link>
                                    )
                                })
                            ) : (
                                <div className="ml-4 text-gray-500 text-sm">No boards yet</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Settings */}
                <div className="mt-8 pt-4 border-t border-gray-700">
                    {settingsNavigation.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                                    isActive
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                )}
                            >
                                <item.icon className={cn(
                                    'mr-3 h-4 w-4',
                                    isActive ? 'text-white' : 'text-gray-400'
                                )} />
                                {item.name}
                            </Link>
                        )
                    })}
                </div>

                {/* Quick Actions */}
                <div className="mt-6">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Quick Actions
                    </h3>
                    <div className="space-y-2">
                        <Button variant="outline" size="sm" className="w-full justify-start bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:border-blue-700">
                            <Share2 className="mr-2 h-4 w-4" />
                            Install Extension
                        </Button>
                    </div>
                </div>
            </div>
        </aside>
    )
}