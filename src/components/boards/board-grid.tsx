'use client'

import { useState } from 'react'
import { Board, BoardAsset, Asset, AssetFile, Tag, AssetTag } from '@prisma/client'
import { AdCard } from '@/components/dashboard/ad-card'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type BoardWithAssets = Board & {
    assets: (BoardAsset & {
        asset: Asset & {
            files: AssetFile[]
            tags: (AssetTag & {
                tag: Tag
            })[]
        }
    })[]
}

interface BoardGridProps {
    board: BoardWithAssets
}

export function BoardGrid({ board }: BoardGridProps) {
    const [deletingAsset, setDeletingAsset] = useState<string | null>(null)
    const router = useRouter()

    const handleDeleteAsset = async (assetId: string) => {
        if (!confirm('Are you sure you want to remove this ad from the board?')) {
            return
        }

        setDeletingAsset(assetId)

        try {
            const response = await fetch(`/api/v1/boards/${board.id}/assets/${assetId}`, {
                method: 'DELETE',
            })

            if (response.ok) {
                toast.success('Ad removed from board successfully!')
                router.refresh()
            } else {
                const errorData = await response.json()
                toast.error(errorData.error || 'Failed to remove ad')
            }
        } catch (error) {
            console.error('Error removing ad:', error)
            toast.error('Failed to remove ad. Please try again.')
        } finally {
            setDeletingAsset(null)
        }
    }

    return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {board.assets.map((boardAsset) => {
                const asset = boardAsset.asset

                // Transform asset data to match AdCard interface
                const transformedAsset = {
                    id: asset.id,
                    platform: asset.platform,
                    fbAdId: asset.fbAdId || '',
                    fbPageId: asset.fbPageId,
                    headline: asset.headline,
                    brandName: asset.brandName,
                    adText: asset.adText,
                    adStatus: asset.adStatus,
                    startDate: asset.startDate,
                    endDate: asset.endDate,
                    dateRange: asset.dateRange,
                    platforms: asset.platforms,
                    cta: asset.cta,
                    ctaUrl: asset.ctaUrl,
                    adUrl: asset.adUrl,
                    createdAt: asset.createdAt.toISOString(),
                    brand: null, // No brand relation in schema
                    files: asset.files,
                    tags: asset.tags.map(assetTag => ({
                        id: assetTag.tag.id,
                        name: assetTag.tag.name,
                        color: assetTag.tag.color
                    }))
                }

                return (
                    <div key={boardAsset.id} className="relative group">
                        <AdCard asset={transformedAsset} />

                        {/* Delete button overlay */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteAsset(asset.id)}
                                disabled={deletingAsset === asset.id}
                                className="h-8 w-8 p-0"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}