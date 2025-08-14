'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDateTime } from '@/lib/utils'
import { Plus, Trash2, Copy, Eye, EyeOff } from 'lucide-react'

interface AccessToken {
    id: string
    name: string
    lastUsed: string | null
    createdAt: string
    expiresAt: string | null
    token?: string // Only present when creating
}

export function TokenManager() {
    const [tokens, setTokens] = useState<AccessToken[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreating, setIsCreating] = useState(false)
    const [newTokenName, setNewTokenName] = useState('')
    const [newTokenExpiry, setNewTokenExpiry] = useState('')
    const [createdToken, setCreatedToken] = useState<AccessToken | null>(null)
    const [showToken, setShowToken] = useState(false)

    useEffect(() => {
        fetchTokens()
    }, [])

    const fetchTokens = async () => {
        try {
            const response = await fetch('/api/v1/tokens')
            if (response.ok) {
                const data = await response.json()
                setTokens(data.tokens)
            }
        } catch (error) {
            console.error('Error fetching tokens:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const createToken = async () => {
        if (!newTokenName.trim()) return

        setIsCreating(true)
        try {
            const response = await fetch('/api/v1/tokens', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: newTokenName,
                    expiresAt: newTokenExpiry || null,
                }),
            })

            if (response.ok) {
                const data = await response.json()
                setCreatedToken(data)
                setNewTokenName('')
                setNewTokenExpiry('')
                await fetchTokens()
            } else {
                const errorData = await response.json()
                alert(`Error: ${errorData.error}`)
            }
        } catch (error) {
            console.error('Error creating token:', error)
            alert('Failed to create token')
        } finally {
            setIsCreating(false)
        }
    }

    const deleteToken = async (tokenId: string) => {
        if (!confirm('Are you sure you want to delete this token? This action cannot be undone.')) {
            return
        }

        try {
            const response = await fetch(`/api/v1/tokens/${tokenId}`, {
                method: 'DELETE',
            })

            if (response.ok) {
                await fetchTokens()
            } else {
                alert('Failed to delete token')
            }
        } catch (error) {
            console.error('Error deleting token:', error)
            alert('Failed to delete token')
        }
    }

    const copyToken = (token: string) => {
        navigator.clipboard.writeText(token)
        alert('Token copied to clipboard!')
    }

    if (isLoading) {
        return <div>Loading tokens...</div>
    }

    return (
        <div className="space-y-6">
            {/* Token Creation Form */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-4">Create New Token</h3>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="token-name" className="block text-sm font-medium text-gray-700 mb-1">
                            Token Name
                        </label>
                        <Input
                            id="token-name"
                            type="text"
                            placeholder="e.g., Chrome Extension, Mobile App"
                            value={newTokenName}
                            onChange={(e) => setNewTokenName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label htmlFor="token-expiry" className="block text-sm font-medium text-gray-700 mb-1">
                            Expiration Date (Optional)
                        </label>
                        <Input
                            id="token-expiry"
                            type="datetime-local"
                            value={newTokenExpiry}
                            onChange={(e) => setNewTokenExpiry(e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Leave empty for tokens that never expire
                        </p>
                    </div>

                    <Button
                        onClick={createToken}
                        disabled={isCreating || !newTokenName.trim()}
                    >
                        {isCreating ? 'Creating...' : (
                            <>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Token
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Created Token Display */}
            {createdToken && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <h3 className="font-medium text-green-900 mb-2">Token Created Successfully!</h3>
                    <p className="text-sm text-green-700 mb-3">
                        Copy this token now - you won't be able to see it again.
                    </p>

                    <div className="bg-white p-3 rounded border font-mono text-sm break-all">
                        <div className="flex items-center justify-between">
                            <span className={showToken ? '' : 'filter blur-sm select-none'}>
                                {createdToken.token}
                            </span>
                            <div className="flex space-x-2 ml-4">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowToken(!showToken)}
                                >
                                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => copyToken(createdToken.token!)}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={() => setCreatedToken(null)}
                        variant="ghost"
                        size="sm"
                        className="mt-3"
                    >
                        Dismiss
                    </Button>
                </div>
            )}

            {/* Existing Tokens */}
            <div>
                <h3 className="font-medium text-gray-900 mb-4">Existing Tokens</h3>

                {tokens.length === 0 ? (
                    <p className="text-gray-500 text-sm">No tokens created yet.</p>
                ) : (
                    <div className="space-y-3">
                        {tokens.map((token) => (
                            <div key={token.id} className="bg-white border border-gray-200 p-4 rounded-lg">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h4 className="font-medium text-gray-900">{token.name}</h4>
                                        <div className="text-sm text-gray-500 space-y-1 mt-1">
                                            <div>Created: {formatDateTime(token.createdAt)}</div>
                                            {token.lastUsed && (
                                                <div>Last used: {formatDateTime(token.lastUsed)}</div>
                                            )}
                                            {token.expiresAt && (
                                                <div>Expires: {formatDateTime(token.expiresAt)}</div>
                                            )}
                                            {!token.lastUsed && (
                                                <div className="text-amber-600">Never used</div>
                                            )}
                                        </div>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteToken(token.id)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}