'use client'

import { useState } from 'react'
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

const boards = [
    { id: '1', name: 'My First Board', color: '#3B82F6' },
    { id: '2', name: 'E-commerce Ads', color: '#10B981' },
    { id: '3', name: 'SaaS Inspiration', color: '#F59E0B' },
]

export function Sidebar() {
    const pathname = usePathname()
    const [boardsExpanded, setBoardsExpanded] = useState(true)

    return (
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-73px)]">
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
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                )}
                            >
                                <item.icon className={cn(
                                    'mr-3 h-4 w-4',
                                    isActive ? 'text-blue-500' : 'text-gray-400'
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
                            className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
                        >
                            {boardsExpanded ? (
                                <ChevronDown className="mr-1 h-4 w-4" />
                            ) : (
                                <ChevronRight className="mr-1 h-4 w-4" />
                            )}
                            Boards
                        </button>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Plus className="h-3 w-3" />
                        </Button>
                    </div>

                    {boardsExpanded && (
                        <div className="mt-2 space-y-1">
                            {boards.map((board) => {
                                const isActive = pathname === `/dashboard/boards/${board.id}`
                                return (
                                    <Link
                                        key={board.id}
                                        href={`/dashboard/boards/${board.id}`}
                                        className={cn(
                                            'flex items-center px-3 py-2 text-sm rounded-md transition-colors ml-4',
                                            isActive
                                                ? 'bg-blue-50 text-blue-600'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        )}
                                    >
                                        <div
                                            className="mr-3 h-3 w-3 rounded-full"
                                            style={{ backgroundColor: board.color }}
                                        />
                                        {board.name}
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Settings */}
                <div className="mt-8 pt-4 border-t border-gray-200">
                    {settingsNavigation.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                                    isActive
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                )}
                            >
                                <item.icon className={cn(
                                    'mr-3 h-4 w-4',
                                    isActive ? 'text-blue-500' : 'text-gray-400'
                                )} />
                                {item.name}
                            </Link>
                        )
                    })}
                </div>

                {/* Quick Actions */}
                <div className="mt-6">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Quick Actions
                    </h3>
                    <div className="space-y-2">
                        <Button variant="outline" size="sm" className="w-full justify-start">
                            <Plus className="mr-2 h-4 w-4" />
                            Add from URL
                        </Button>
                        <Button variant="outline" size="sm" className="w-full justify-start">
                            <Share2 className="mr-2 h-4 w-4" />
                            Install Extension
                        </Button>
                    </div>
                </div>
            </div>
        </aside>
    )
}