'use client'

import { useState } from 'react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { Board, BoardAsset, Asset, AssetFile, Tag, AssetTag } from '@prisma/client'
import { Button } from '@/components/ui/button'
import {
    ExternalLink,
    Eye,
    Tag as TagIcon,
    Trash2,
    Play
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

    const handleVideoPlay = (asset: Asset & { files: AssetFile[] }) => {
        const videoFile = asset.files.find(f => f.type === 'video')
        if (videoFile) {
            window.open(videoFile.url, '_blank')
        }
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
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {board.assets.map((boardAsset) => {
                    const asset = boardAsset.asset

                    // Prioritize video_poster for thumbnail display, then any image, then first file
                    const videoPoster = asset.files.find(f => f.type === 'image' && f.cloudinaryId?.includes('video_poster'))
                    const primaryImage = videoPoster || asset.files.find(f => f.type === 'image') || asset.files[0]
                    const hasVideo = asset.files.some(f => f.type === 'video')

                    return (
                        <div
                            key={boardAsset.id}
                            className="group bg-white rounded-lg overflow-hidden hover:shadow-md transition-all duration-200 border-0"
                        >
                            {/* Ad Preview */}
                            <div className="relative">
                                <div
                                    className="aspect-[4/5] bg-gray-100 relative overflow-hidden cursor-pointer"
                                    onClick={() => hasVideo ? handleVideoPlay(asset) : openAdPreview(asset.id)}
                                >
                                    {primaryImage ? (
                                        <>
                                            <Image
                                                src={primaryImage.url}
                                                alt={asset.headline || 'Facebook Ad'}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                                            />
                                            {/* Video Play Button Overlay */}
                                            {hasVideo && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-all duration-300">
                                                    <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 group-hover:bg-primary group-hover:scale-110 transition-all duration-300 shadow-lg">
                                                        <Play className="w-6 h-6 text-black group-hover:text-white fill-current" />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Top right indicators */}
                                            <div className="absolute top-2 right-2 flex flex-col gap-1">
                                                {/* Time indicator for videos */}
                                                {hasVideo && (
                                                    <div className="bg-black/70 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                                                        Video
                                                    </div>
                                                )}

                                                {/* Actions menu */}
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    <div className="flex flex-col gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 bg-black bg-opacity-60 hover:bg-opacity-80 text-white border-0"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                window.open(asset.adUrl, '_blank')
                                                            }}
                                                            title="View Original Ad"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 bg-black bg-opacity-60 hover:bg-opacity-80 text-white border-0"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleDeleteAsset(asset.id)
                                                            }}
                                                            disabled={deletingAsset === asset.id}
                                                            title={deletingAsset === asset.id ? 'Removing...' : 'Remove from Board'}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
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
                                </div>


                            </div>

                            {/* Ad Info - Full content visible */}
                            <div className="p-4">
                                {/* Full Title */}
                                <h3 className="font-medium text-gray-900 text-sm mb-3 leading-tight">
                                    {asset.headline || 'Untitled Ad'}
                                </h3>

                                {/* Full Ad Text */}
                                {asset.adText && (
                                    <div className="mb-3">
                                        <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                                            {asset.adText}
                                        </p>
                                    </div>
                                )}

                                {/* Tags */}
                                {asset.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {asset.tags.map((assetTag) => (
                                            <span
                                                key={assetTag.id}
                                                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                                            >
                                                <TagIcon className="w-3 h-3 mr-1" />
                                                {assetTag.tag.name}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Metadata */}
                                <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
                                    <span className="flex items-center gap-1">
                                        <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                                        Saved {formatDistanceToNow(new Date(boardAsset.addedAt), { addSuffix: true })}
                                    </span>

                                    {/* Brand name */}
                                    {asset.brandName && (
                                        <span className="text-gray-700 font-medium">
                                            {asset.brandName}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Ad Preview Modal - TODO: Implement in next step */}
            {selectedAd && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Ad Preview</h2>
                            <Button
                                variant="ghost"
                                onClick={() => setSelectedAd(null)}
                                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
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
