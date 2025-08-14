'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Loader2 } from 'lucide-react'

export function AddAdDialog() {
    const [isOpen, setIsOpen] = useState(false)
    const [url, setUrl] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const response = await fetch('/api/v1/assets/fb', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ adUrl: url }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to add ad')
            }

            const result = await response.json()
            console.log('Ad added:', result)

            // Reset form and close dialog
            setUrl('')
            setIsOpen(false)

            // Refresh the page to show the new ad
            window.location.reload()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    if (!isOpen) {
        return (
            <Button onClick={() => setIsOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Ad
            </Button>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h2 className="text-lg font-semibold mb-4">Add Facebook Ad</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="ad-url" className="block text-sm font-medium text-gray-700 mb-2">
                            Facebook Ad URL
                        </label>
                        <Input
                            id="ad-url"
                            type="url"
                            placeholder="https://www.facebook.com/ads/library/?id=..."
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Paste the URL from Facebook Ad Library or any Facebook ad
                        </p>
                    </div>

                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                            {error}
                        </div>
                    )}

                    <div className="flex space-x-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsOpen(false)
                                setUrl('')
                                setError('')
                            }}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || !url}
                            className="flex-1"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Adding...
                                </>
                            ) : (
                                'Add Ad'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}