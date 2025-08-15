'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

interface AddAdToBoardProps {
    boardId: string
}

export function AddAdToBoard({ boardId }: AddAdToBoardProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [url, setUrl] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!url.trim()) return

        setIsLoading(true)
        try {
            const response = await fetch('/api/v1/assets/fb', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    adUrl: url.trim(),
                    boardId,
                }),
            })

            if (response.ok) {
                let data: { message?: string } = {}
                try {
                    data = await response.json()
                } catch (parseError) {
                    console.error('Failed to parse success response:', parseError)
                    data = { message: 'Ad added successfully!' }
                }
                setUrl('')
                setIsOpen(false)
                toast.success(data.message || 'Ad added successfully!')
                router.refresh()
            } else {
                let errorData: { error?: string; details?: string } = {}

                try {
                    errorData = await response.json()
                } catch (jsonError) {
                    try {
                        const responseClone = response.clone()
                        const responseText = await responseClone.text()

                        if (responseText && responseText.trim()) {
                            errorData = JSON.parse(responseText)
                        } else {
                            errorData = { error: 'Empty response from server' }
                        }
                    } catch (textError) {
                        errorData = { error: 'Invalid response format from server' }
                    }
                }

                if (response.status === 409) {
                    // Conflict - ad already exists
                    toast.error(errorData.error || 'Ad already exists', {
                        description: errorData.details || 'This ad has already been added.'
                    })
                } else {
                    toast.error(`Failed to add ad: ${errorData.error || `Server error ${response.status}`}`)
                }
            }
        } catch (error) {
            console.error('Error adding ad:', error)
            toast.error('Failed to add ad. Please check the URL and try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            <Button onClick={() => setIsOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Ad
            </Button>

            {isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Add Facebook Ad</h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                                    Facebook Ad URL
                                </label>
                                <Input
                                    id="url"
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://www.facebook.com/ads/library/..."
                                    required
                                    disabled={isLoading}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Paste a URL from Facebook Ad Library. We'll create a reference entry with the link - full API access requires Facebook app approval.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsOpen(false)}
                                    disabled={isLoading}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isLoading || !url.trim()}>
                                    {isLoading ? 'Adding...' : 'Add Ad'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
