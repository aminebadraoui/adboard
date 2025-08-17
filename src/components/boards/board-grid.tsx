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
    const [selectedAd, setSelectedAd] = useState<string | null>(null)
    const router = useRouter()

    const openAdPreview = (assetId: string) => {
        setSelectedAd(assetId)
    }

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
        <>
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
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
                        brandImageUrl: asset.brandImageUrl,
                        adText: asset.adText,
                        adStatus: asset.adStatus,
                        startDate: asset.startDate,
                        endDate: asset.endDate,
                        dateRange: asset.dateRange,
                        platforms: asset.platforms,
                        cta: asset.cta,
                        ctaType: asset.ctaType,
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
                        <div key={boardAsset.id} className="relative group break-inside-avoid mb-6">
                            <AdCard
                                asset={transformedAsset}
                                onClick={() => openAdPreview(asset.id)}
                            />

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

            {/* Ad Preview Modal */}
            {selectedAd && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white border rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Ad Preview</h2>
                            <Button
                                variant="ghost"
                                onClick={() => setSelectedAd(null)}
                                className="h-8 w-8 p-0 text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                            >
                                ✕
                            </Button>
                        </div>

                        {(() => {
                            const selectedAsset = board.assets.find(ba => ba.asset.id === selectedAd)?.asset
                            if (!selectedAsset) return <p>Asset not found</p>

                            const transformedSelectedAsset = {
                                id: selectedAsset.id,
                                platform: selectedAsset.platform,
                                fbAdId: selectedAsset.fbAdId || '',
                                fbPageId: selectedAsset.fbPageId,
                                headline: selectedAsset.headline,
                                brandName: selectedAsset.brandName,
                                brandImageUrl: selectedAsset.brandImageUrl,
                                adText: selectedAsset.adText,
                                adStatus: selectedAsset.adStatus,
                                startDate: selectedAsset.startDate,
                                endDate: selectedAsset.endDate,
                                dateRange: selectedAsset.dateRange,
                                platforms: selectedAsset.platforms,
                                cta: selectedAsset.cta,
                                ctaType: selectedAsset.ctaType,
                                ctaUrl: selectedAsset.ctaUrl,
                                adUrl: selectedAsset.adUrl,
                                createdAt: selectedAsset.createdAt.toISOString(),
                                brand: null,
                                files: selectedAsset.files,
                                tags: selectedAsset.tags.map(assetTag => ({
                                    id: assetTag.tag.id,
                                    name: assetTag.tag.name,
                                    color: assetTag.tag.color
                                }))
                            }

                            return <AdCard asset={transformedSelectedAsset} highQualityImages={true} />
                        })()}
                    </div>
                </div>
            )}
        </>
    )
}