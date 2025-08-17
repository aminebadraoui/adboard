import { formatDate, truncateText } from '@/lib/utils'
import { Play, ExternalLink, Calendar, Shield, ShieldCheck } from 'lucide-react'

interface Asset {
    id: string
    platform: string
    fbAdId: string
    fbPageId?: string | null
    headline?: string | null
    brandName?: string | null
    adText?: string | null
    adStatus?: string | null
    startDate?: string | null
    endDate?: string | null
    dateRange?: string | null
    platforms?: string[] | null
    cta?: string | null
    ctaUrl?: string | null
    adUrl?: string | null
    createdAt: string
    brand?: {
        fbPageId: string
        name: string
        imageUrl: string
    } | null
    files: Array<{
        id: string
        type: string
        url: string
        thumbnailUrl?: string | null
    }>
    tags: Array<{
        id: string
        name: string
        color?: string | null
    }>
}

interface AdCardProps {
    asset: Asset
}

export function AdCard({ asset }: AdCardProps) {
    const primaryFile = asset.files[0]
    const isVideo = primaryFile?.type === 'video'

    // Create Facebook Ad Library URL for brand
    const brandAdLibraryUrl = asset.brand?.fbPageId || asset.fbPageId
        ? `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&view_all_page_id=${asset.brand?.fbPageId || asset.fbPageId}`
        : null

    // Create original ad URL
    const originalAdUrl = asset.adUrl || `https://www.facebook.com/ads/library/?id=${asset.fbAdId}`

    // Format date range
    const getDateDisplay = () => {
        if (asset.dateRange) return asset.dateRange
        if (asset.startDate && asset.endDate) return `${asset.startDate} - ${asset.endDate}`
        if (asset.startDate) return `Started ${asset.startDate}`
        return null
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            {/* 1. Active Status */}
            {asset.adStatus && (
                <div className="px-4 pt-3 pb-2">
                    <div className="flex items-center gap-2">
                        {asset.adStatus === 'Active' ? (
                            <ShieldCheck className="h-4 w-4 text-green-600" />
                        ) : (
                            <Shield className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={`text-sm font-medium ${asset.adStatus === 'Active' ? 'text-green-600' : 'text-gray-500'
                            }`}>
                            {asset.adStatus}
                        </span>
                    </div>
                </div>
            )}

            {/* 2. Date of Running */}
            {getDateDisplay() && (
                <div className="px-4 pb-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>{getDateDisplay()}</span>
                    </div>
                </div>
            )}

            {/* 3. Platforms */}
            {asset.platforms && asset.platforms.length > 0 && (
                <div className="px-4 pb-3">
                    <div className="flex flex-wrap gap-1">
                        {asset.platforms.map((platform) => (
                            <span
                                key={platform}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                                {platform}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* 4. Brand Name and Image (linking to FB Ad Library) */}
            {(asset.brand || asset.brandName) && (
                <div className="px-4 pb-3">
                    {brandAdLibraryUrl ? (
                        <a
                            href={brandAdLibraryUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                        >
                            {/* Brand image */}
                            {asset.brand?.imageUrl && (
                                <img
                                    src={asset.brand.imageUrl}
                                    alt={asset.brand.name}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                            )}
                            {/* Brand name and page ID */}
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-gray-900 truncate">
                                    {asset.brand?.name || asset.brandName}
                                </div>
                                {(asset.brand?.fbPageId || asset.fbPageId) && (
                                    <div className="text-xs text-gray-500">
                                        Page ID: {asset.brand?.fbPageId || asset.fbPageId}
                                    </div>
                                )}
                            </div>
                            <ExternalLink className="h-4 w-4 text-gray-400" />
                        </a>
                    ) : (
                        <div className="flex items-center gap-3">
                            {/* Brand image */}
                            {asset.brand?.imageUrl && (
                                <img
                                    src={asset.brand.imageUrl}
                                    alt={asset.brand.name}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                            )}
                            {/* Brand name */}
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-gray-900 truncate">
                                    {asset.brand?.name || asset.brandName}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 5. Media (Image or Video) */}
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

            {/* 6. Ad Description (Text) */}
            <div className="p-4">
                {asset.adText && (
                    <div className="text-sm text-gray-700 mb-3 leading-relaxed">
                        {truncateText(asset.adText, 120)}
                    </div>
                )}

                {/* 7. CTA Title and Link */}
                {asset.cta && (
                    <div className="mb-3">
                        {asset.ctaUrl ? (
                            <a
                                href={asset.ctaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                                {asset.cta}
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        ) : (
                            <div className="inline-flex items-center bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium">
                                {asset.cta}
                            </div>
                        )}
                    </div>
                )}

                {/* 8. Link to Original Ad */}
                <div className="flex items-center justify-between text-xs">
                    <a
                        href={originalAdUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                    >
                        View Original Ad
                        <ExternalLink className="h-3 w-3" />
                    </a>
                    <span className="text-gray-400">{formatDate(asset.createdAt)}</span>
                </div>

                {/* Tags (Optional) */}
                {asset.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-gray-100">
                        {asset.tags.slice(0, 3).map((tag) => (
                            <span
                                key={tag.id}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
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
            </div>
        </div>
    )
}