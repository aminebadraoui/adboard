'use client'

import { useState } from 'react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { Board, BoardAsset, Asset, AssetFile, Tag, AssetTag } from '@prisma/client'
import { Button } from '@/components/ui/button'
import {
    ExternalLink,
    Heart,
    Eye,
    Tag as TagIcon,
    Trash2
} from 'lucide-react'
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
    const [selectedAd, setSelectedAd] = useState<string | null>(null)
    const [deletingAsset, setDeletingAsset] = useState<string | null>(null)
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
                router.refresh() // Refresh to update the board
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
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {board.assets.map((boardAsset) => {
                    const asset = boardAsset.asset
                    const primaryImage = asset.files.find(f => f.type === 'image') || asset.files[0]

                    return (
                        <div
                            key={boardAsset.id}
                            className="group bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                        >
                            {/* Ad Preview */}
                            <div className="aspect-square bg-gray-100 relative overflow-hidden">
                                {primaryImage ? (
                                    <Image
                                        src={primaryImage.url}
                                        alt={asset.headline || 'Facebook Ad'}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-200"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <div className="text-center">
                                            <div className="w-12 h-12 mx-auto mb-2 bg-gray-200 rounded-lg flex items-center justify-center">
                                                <Eye className="w-6 h-6 text-gray-400" />
                                            </div>
                                            <p className="text-xs text-gray-500">No preview</p>
                                        </div>
                                    </div>
                                )}

                                {/* Overlay Actions */}
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200">
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => openAdPreview(asset.id)}
                                            className="h-8 w-8 p-0"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Ad Info */}
                            <div className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="font-medium text-gray-900 text-sm line-clamp-2 flex-1">
                                        {asset.headline || asset.adText?.split('.')[0] || 'Untitled Ad'}
                                    </h3>
                                    <div className="flex items-center gap-1 ml-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => window.open(asset.adUrl, '_blank')}
                                            title="View Original Ad"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleDeleteAsset(asset.id)}
                                            disabled={deletingAsset === asset.id}
                                            title={deletingAsset === asset.id ? 'Removing...' : 'Remove from Board'}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>

                                {asset.description && (
                                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                                        {asset.description}
                                    </p>
                                )}

                                {/* Tags */}
                                {asset.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {asset.tags.slice(0, 3).map((assetTag) => (
                                            <span
                                                key={assetTag.id}
                                                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700"
                                            >
                                                <TagIcon className="w-3 h-3 mr-1" />
                                                {assetTag.tag.name}
                                            </span>
                                        ))}
                                        {asset.tags.length > 3 && (
                                            <span className="text-xs text-gray-500">
                                                +{asset.tags.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Ad Metadata */}
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>
                                        Added {formatDistanceToNow(new Date(boardAsset.addedAt), { addSuffix: true })}
                                    </span>
                                    {asset.sourceUrl && (
                                        <a
                                            href={asset.sourceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center text-blue-600 hover:text-blue-800"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Ad Preview Modal - TODO: Implement in next step */}
            {selectedAd && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold">Ad Preview</h2>
                            <Button
                                variant="ghost"
                                onClick={() => setSelectedAd(null)}
                                className="h-8 w-8 p-0"
                            >
                                ✕
                            </Button>
                        </div>
                        <p className="text-gray-600">Preview modal will be implemented next!</p>
                    </div>
                </div>
            )}
        </>
    )
}
