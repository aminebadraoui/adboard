'use client'

import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Plus, Settings, LogOut, User } from 'lucide-react'

export function DashboardNav() {
    const { data: session } = useSession()
    const [searchQuery, setSearchQuery] = useState('')

    return (
        <header className="bg-gray-900 border-b border-gray-700">
            <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center space-x-4">
                        <div className="h-8 w-8 flex items-center justify-center rounded bg-blue-600">
                            <span className="text-sm font-bold text-white">AB</span>
                        </div>
                        <h1 className="text-xl font-semibold text-white">AdBoard</h1>
                    </div>

                    {/* Search */}
                    <div className="flex-1 max-w-lg mx-8">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                                type="text"
                                placeholder="Search ads, brands, or keywords..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="icon" asChild className="text-gray-300 hover:text-white hover:bg-gray-800">
                                <a href="/dashboard/settings">
                                    <Settings className="h-4 w-4" />
                                </a>
                            </Button>

                            <div className="flex items-center space-x-2 border-l border-gray-600 pl-3">
                                <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
                                    {session?.user?.image ? (
                                        <img
                                            src={session.user.image}
                                            alt={session.user.name || 'User'}
                                            className="h-8 w-8 rounded-full"
                                        />
                                    ) : (
                                        <User className="h-4 w-4 text-gray-300" />
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => signOut()}
                                    className="text-gray-300 hover:text-white hover:bg-gray-800"
                                >
                                    <LogOut className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    )
}