import React from 'react'
import { formatDate } from '@/lib/utils'
import { Play, ExternalLink, Calendar, Shield, ShieldCheck } from 'lucide-react'

interface Asset {
    id: string
    platform: string
    fbAdId: string
    fbPageId?: string | null
    headline?: string | null
    brandName?: string | null
    brandImageUrl?: string | null
    adText?: string | null
    adStatus?: string | null
    startDate?: string | null
    endDate?: string | null
    dateRange?: string | null
    platforms?: string[] | null
    cta?: string | null
    ctaType?: string | null
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
        source?: string | null
    }>
    tags: Array<{
        id: string
        name: string
        color?: string | null
    }>
}

interface AdCardProps {
    asset: Asset
    onClick?: () => void
    highQualityImages?: boolean // Use full quality images instead of thumbnails
}

export function AdCard({ asset, onClick, highQualityImages = false }: AdCardProps) {
    // Find video file explicitly by source or type
    const videoFile = asset.files.find(file =>
        file.type === 'video' || file.source === 'video_src'
    )

    // Find video poster file explicitly
    const videoPosterFile = asset.files.find(file =>
        file.source === 'video_poster'
    )

    // Determine if this is a video ad - either we have a video file OR we have a video_poster (which implies a video)
    const isVideo = !!videoFile || !!videoPosterFile

    // For non-video ads, use the first file as primary
    const primaryFile = isVideo ? (videoPosterFile || videoFile) : asset.files[0]

    // State for video playback
    const [isPlayingVideo, setIsPlayingVideo] = React.useState(false)

    // Function to get optimal image URL based on context
    const getImageUrl = (file: any) => {
        if (!file) return ''

        // For mood board, always use high quality images to show full visual detail
        // If it's a Cloudinary URL, we can transform it for optimal quality
        if (file.url && file.url.includes('cloudinary.com')) {
            if (highQualityImages) {
                // For modal: Transform Cloudinary URL for highest quality
                return file.url.replace('/upload/', '/upload/q_auto:best,f_auto,w_800,h_800,c_limit/')
            } else {
                // For card view: Use good quality but not size-limited for mood board
                return file.url.replace('/upload/', '/upload/q_auto:good,f_auto/')
            }
        }

        // For non-Cloudinary URLs, always use the original
        return file.url
    }

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
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col break-inside-avoid">
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







            {/* 5. Media (Image or Video) - Prominent for mood board */}
            <div
                className={`bg-gray-100 relative ${onClick && !isPlayingVideo ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
                onClick={isPlayingVideo ? undefined : () => {
                    setIsPlayingVideo(false); // Reset video state when opening modal
                    onClick && onClick();
                }}
                style={{ width: '100%', height: 'auto' }}
            >
                {primaryFile ? (
                    <>
                        {isVideo ? (
                            <div className="relative">
                                {!isPlayingVideo ? (
                                    // Show poster image with play button overlay
                                    <>
                                        <img
                                            src={videoPosterFile ? getImageUrl(videoPosterFile) : (videoFile ? getImageUrl(videoFile) : '')}
                                            alt={asset.headline || 'Video thumbnail'}
                                            className="w-full h-auto"
                                            style={{
                                                maxHeight: 'none',
                                                height: 'auto',
                                                width: '100%',
                                                display: 'block'
                                            }}
                                        />
                                        {videoFile && (
                                            <div
                                                className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-black hover:bg-opacity-10 transition-all"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsPlayingVideo(true);
                                                }}
                                            >
                                                <div className="bg-black bg-opacity-70 rounded-full p-4 hover:bg-opacity-90 transition-all">
                                                    <Play className="h-8 w-8 text-white" fill="currentColor" />
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    // Show video player when playing
                                    <div className="relative">
                                        <video
                                            className="w-full h-auto"
                                            controls
                                            autoPlay
                                            preload="metadata"
                                            onEnded={() => setIsPlayingVideo(false)}
                                        >
                                            <source src={videoFile?.url} type="video/mp4" />
                                            Your browser does not support the video tag.
                                        </video>
                                        <button
                                            className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded hover:bg-opacity-90 transition-all"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsPlayingVideo(false);
                                            }}
                                        >
                                            Back to poster
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <img
                                src={getImageUrl(primaryFile)}
                                alt={asset.headline || 'Ad creative'}
                                className="w-full h-auto"
                                style={{
                                    maxHeight: 'none',
                                    height: 'auto',
                                    width: '100%',
                                    display: 'block'
                                }}
                            />
                        )}
                        {/* Show video indicator or file count */}
                        <div className="absolute top-2 right-2 flex gap-2">
                            {isVideo && !isPlayingVideo && (
                                <div className="bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                    <Play className="h-3 w-3" fill="currentColor" />
                                    Video
                                </div>
                            )}
                            {asset.files.length > 1 && (
                                <div className="bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                                    +{asset.files.length - 1}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="w-full h-48 flex items-center justify-center text-gray-400">
                        No media
                    </div>
                )}
            </div>

            {/* 6. Ad Description (Text) */}
            <div className="p-4">
                {asset.adText && (
                    <div className="text-sm text-gray-700 mb-3 leading-relaxed whitespace-pre-wrap">
                        {asset.adText}
                    </div>
                )}

                {/* Date of Running */}
                {getDateDisplay() && (
                    <div className="mb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>{getDateDisplay()}</span>
                        </div>
                    </div>
                )}

                {/* Platforms */}
                {asset.platforms && asset.platforms.length > 0 && (
                    <div className="mb-3">
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

                {/* Brand Name and Image (linking to FB Ad Library) */}
                {(asset.brand || asset.brandName) && (
                    <div className="mb-3">
                        {brandAdLibraryUrl ? (
                            <a
                                href={brandAdLibraryUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                            >
                                {/* Brand image */}
                                {(asset.brand?.imageUrl || asset.brandImageUrl) && (
                                    <img
                                        src={asset.brand?.imageUrl || asset.brandImageUrl || ''}
                                        alt={asset.brand?.name || asset.brandName || ''}
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
                                {(asset.brand?.imageUrl || asset.brandImageUrl) && (
                                    <img
                                        src={asset.brand?.imageUrl || asset.brandImageUrl || ''}
                                        alt={asset.brand?.name || asset.brandName || ''}
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

                {/* 7. CTA Analysis */}
                {(asset.cta || asset.ctaType || asset.ctaUrl) && (
                    <div className="mb-3 space-y-2">
                        {asset.cta && (
                            <div>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">CTA Title</span>
                                <div className="text-sm text-gray-800 font-medium">{asset.cta}</div>
                            </div>
                        )}

                        {asset.ctaType && (
                            <div>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">CTA Type</span>
                                <div className="text-sm text-blue-600 font-medium">{asset.ctaType}</div>
                            </div>
                        )}

                        {asset.ctaUrl && (
                            <div>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">CTA URL</span>
                                <div>
                                    <a
                                        href={asset.ctaUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:text-blue-800 underline break-all"
                                    >
                                        {asset.ctaUrl}
                                    </a>
                                </div>
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