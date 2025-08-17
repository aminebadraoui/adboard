import { formatDate, truncateText } from '@/lib/utils'
import { Play } from 'lucide-react'

interface Asset {
    id: string
    platform: string
    fbAdId: string
    fbPageId?: string
    headline?: string
    brandName?: string
    adText?: string
    createdAt: string
    brand?: {
        fbPageId: string
        name: string
        imageUrl: string
    }
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

interface AdCardProps {
    asset: Asset
}

export function AdCard({ asset }: AdCardProps) {
    const primaryFile = asset.files[0]
    const isVideo = primaryFile?.type === 'video'

    // Log asset data for debugging
    console.log('🎯 AdCard: Rendering asset:', {
        id: asset.id,
        fbAdId: asset.fbAdId,
        fbPageId: asset.fbPageId,
        brandName: asset.brandName,
        brand: asset.brand,
        headline: asset.headline,
        adText: asset.adText,
        files: asset.files.length,
        tags: asset.tags.length,
        createdAt: asset.createdAt
    })

    // Log brand information specifically
    if (asset.brand) {
        console.log('✅ AdCard: Brand data found:', {
            fbPageId: asset.brand.fbPageId,
            name: asset.brand.name,
            imageUrl: asset.brand.imageUrl
        })
    } else if (asset.brandName) {
        console.log('⚠️ AdCard: Only brandName available (no brand object):', asset.brandName)
    } else {
        console.log('❌ AdCard: No brand information available')
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            {/* Media */}
            <div className="aspect-square bg-gray-100 relative">
                {primaryFile ? (
                    <>
                        <img
                            src={primaryFile.thumbnailUrl || primaryFile.url}
                            alt={asset.headline || 'Ad creative'}
                            className="w-full h-full object-cover"
                        />
                        {isVideo && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="bg-black bg-opacity-50 rounded-full p-3">
                                    <Play className="h-6 w-6 text-white" fill="currentColor" />
                                </div>
                            </div>
                        )}
                        {asset.files.length > 1 && (
                            <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                                +{asset.files.length - 1}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No media
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Brand section with image and name */}
                {(asset.brand || asset.brandName) && (
                    <div className="flex items-center gap-3 mb-3">
                        {/* Brand image */}
                        {asset.brand?.imageUrl && (
                            <img
                                src={asset.brand.imageUrl}
                                alt={asset.brand.name}
                                className="w-8 h-8 rounded-full object-cover"
                            />
                        )}
                        {/* Brand name and page ID */}
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                                {asset.brand?.name || asset.brandName}
                            </div>
                            {asset.brand?.fbPageId && (
                                <div className="text-xs text-gray-500">
                                    ID: {asset.brand.fbPageId}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Headline */}
                {asset.headline && (
                    <div className="text-sm text-gray-700 mb-2">
                        {truncateText(asset.headline, 60)}
                    </div>
                )}

                {/* Ad text */}
                {asset.adText && (
                    <div className="text-xs text-gray-500 mb-3">
                        {truncateText(asset.adText, 80)}
                    </div>
                )}

                {/* Tags */}
                {asset.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                        {asset.tags.slice(0, 3).map((tag) => (
                            <span
                                key={tag.id}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                                style={{
                                    backgroundColor: tag.color ? `${tag.color}20` : undefined,
                                    color: tag.color || undefined,
                                }}
                            >
                                {tag.name}
                            </span>
                        ))}
                        {asset.tags.length > 3 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                +{asset.tags.length - 3}
                            </span>
                        )}
                    </div>
                )}

                {/* Meta */}
                <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{formatDate(asset.createdAt)}</span>
                    <span>{asset.platform}</span>
                </div>
            </div>
        </div>
    )
}