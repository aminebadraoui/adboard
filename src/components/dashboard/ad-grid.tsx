'use client'

import { useState, useEffect } from 'react'
import { AdCard } from './ad-card'

interface Asset {
    id: string
    platform: string
    fbAdId: string
    headline?: string
    brandName?: string
    adText?: string
    createdAt: string
    files: Array<{
        id: string
        type: string
        url: string
        thumbnailUrl?: string
    }>
    tags: Array<{
        id: string
        name: string
        color?: string
    }>
}

interface AdGridProps {
    limit?: number
}

export function AdGrid({ limit }: AdGridProps) {
    const [assets, setAssets] = useState<Asset[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchAssets = async () => {
            try {
                const params = new URLSearchParams()
                if (limit) {
                    params.append('limit', limit.toString())
                }

                const response = await fetch(`/api/v1/assets?${params}`)

                if (!response.ok) {
                    throw new Error('Failed to fetch ads')
                }

                const data = await response.json()
                setAssets(data.assets || [])
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred')
            } finally {
                setIsLoading(false)
            }
        }

        fetchAssets()
    }, [limit])

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: limit || 8 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                        <div className="aspect-square bg-gray-200 rounded mb-3"></div>
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <div className="text-red-600 mb-2">Error loading ads</div>
                <div className="text-sm text-gray-500">{error}</div>
            </div>
        )
    }

    if (assets.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="text-gray-500 mb-2">No ads found</div>
                <div className="text-sm text-gray-400">
                    Add your first Facebook ad to get started
                </div>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {assets.map((asset) => (
                <AdCard key={asset.id} asset={asset} />
            ))}
        </div>
    )
}