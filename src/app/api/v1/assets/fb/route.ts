import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedUser, getOrCreateDefaultOrg, checkOrgAccess } from '@/lib/auth-helpers'
// Use the working API endpoint approach instead
import { validateFacebookAdUrl, calculateRuntimeDays } from '@/lib/facebook-scraper'
import { uploadImageFromUrl, uploadVideoFromUrl, cloudinary } from '@/lib/cloudinary'
import { prisma } from '@/lib/prisma'

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
    const origin = request.headers.get('origin')

    const response = new NextResponse(null, { status: 200 })

    if (origin && (origin.includes('facebook.com') || origin.startsWith('chrome-extension://'))) {
        response.headers.set('Access-Control-Allow-Origin', origin)
        response.headers.set('Access-Control-Allow-Credentials', 'true')
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-Requested-With')
    }

    return response
}

const createAssetSchema = z.object({
    boardIds: z.array(z.string()).min(1, "At least one board ID is required"),
    pageId: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
    // Ad data extracted by Chrome extension
    adData: z.object({
        pageId: z.string().optional(), // Page ID
        adStatus: z.string().optional(), // Active/Inactive
        libraryId: z.string().optional(), // New naming for ad ID
        fbAdId: z.string().optional(), // Legacy naming for ad ID
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        dateRange: z.string().optional(),
        platforms: z.array(z.string()).optional().default([]),
        brandImageUrl: z.string().optional(),
        brandName: z.string(),
        adText: z.string().optional(),
        headline: z.string().optional(),
        mediaDetails: z.array(z.object({
            url: z.string(),
            type: z.enum(['image', 'video']),
            source: z.string(), // e.g., 'video_src', 'video_poster', 'main_image'
            alt: z.string().optional(),
        })).optional().default([]),
        cta: z.string().optional(),
        ctaUrl: z.string().optional(),
        firstSeenDate: z.string().optional(), // ISO date string
        lastSeenDate: z.string().optional(), // ISO date string
        description: z.string().optional(), // Keep for backward compatibility
    }).refine(data => data.libraryId || data.fbAdId, {
        message: "Either libraryId or fbAdId must be provided",
        path: ["libraryId"]
    }),
})

export async function POST(req: NextRequest) {
    // Add request deduplication
    const requestId = crypto.randomUUID()
    console.log(`🚀 ASSETS/FB: New request started [${requestId}]`)

    try {
        // Authenticate user
        console.log('🚨 About to authenticate user...')
        let authContext = await getAuthenticatedUser(req)

        if (!authContext) {
            console.log('🔍 ASSETS/FB: NextAuth failed, trying manual session validation...')
            const cookieHeader = req.headers.get('cookie')
            if (cookieHeader) {
                const sessionTokenMatch = cookieHeader.match(/authjs\.session-token=([^;]+)/)
                if (sessionTokenMatch) {
                    const sessionToken = sessionTokenMatch[1]
                    console.log('🔍 ASSETS/FB: Found session token, looking up in database...')

                    const dbSession = await prisma.session.findUnique({
                        where: { sessionToken },
                        include: { user: true }
                    })

                    if (dbSession && dbSession.expires > new Date()) {
                        const user = dbSession.user
                        authContext = { user, userId: user.id }
                        console.log('🎯 ASSETS/FB: Found valid session in database for user:', user.id)
                    }
                }
            }
        }

        if (!authContext) {
            console.log('🚨 ASSETS/FB: Unauthorized - no valid session found')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { user, userId } = authContext
        console.log('🚨 User authenticated successfully:', userId)

        // Parse request body
        const body = await req.json()
        console.log('🚨 Request body:', body)
        const { boardIds, pageId, tags, adData } = createAssetSchema.parse(body)
        console.log('🚨 Parsed data - boardIds:', boardIds, 'pageId:', pageId)
        console.log('🎯 Received ad data:', adData)

        // Get or create default organization first
        const orgId = await getOrCreateDefaultOrg(userId)
        console.log('🚨 User org ID:', orgId)

        // SECURITY: Validate that all boardIds belong to the user's organization
        if (boardIds.length > 0) {
            const validBoards = await prisma.board.findMany({
                where: {
                    id: { in: boardIds },
                    orgId: orgId
                },
                select: { id: true }
            })

            const validBoardIds = validBoards.map(b => b.id)
            const invalidBoardIds = boardIds.filter(id => !validBoardIds.includes(id))

            if (invalidBoardIds.length > 0) {
                console.error('🚨 Invalid board IDs detected:', invalidBoardIds)
                return NextResponse.json(
                    {
                        error: 'Invalid board access',
                        details: 'One or more boards do not exist or you do not have access to them.',
                        invalidBoardIds
                    },
                    { status: 403 }
                )
            }

            console.log('✅ All board IDs validated for org:', orgId)
        }

        // Use libraryId from the extracted adData (fallback to fbAdId for backward compatibility)
        const adId = adData.libraryId || adData.fbAdId
        if (!adId) {
            return NextResponse.json({ error: 'Missing Facebook ad ID' }, { status: 400 })
        }
        console.log('✅ Using Facebook ad ID from extension:', adId)

        // Check if asset already exists for this ad ID and org
        const existingAsset = await prisma.asset.findUnique({
            where: {
                fbAdId_orgId: {
                    fbAdId: adId,
                    orgId
                }
            },
            include: {
                files: true,
                boards: {
                    include: {
                        board: true
                    }
                }
            }
        })

        console.log('🚨 Checking if asset already exists for adId:', adId, 'orgId:', orgId)

        // If asset exists, check if it needs to be added to new boards
        if (existingAsset) {
            console.log('✅ Asset already exists, checking board associations...')

            // Get existing board IDs for this asset
            const existingBoardIds = existingAsset.boards.map(ba => ba.boardId)
            console.log('Existing board IDs:', existingBoardIds)

            // Find new board IDs that don't already have this asset
            const newBoardIds = boardIds.filter(boardId => !existingBoardIds.includes(boardId))
            console.log('New board IDs to add:', newBoardIds)

            if (newBoardIds.length > 0) {
                // Add asset to new boards
                const boardAssetCreations = newBoardIds.map(boardId => ({
                    boardId,
                    assetId: existingAsset.id
                }))

                await prisma.boardAsset.createMany({
                    data: boardAssetCreations
                })

                return NextResponse.json({
                    id: existingAsset.id,
                    fbAdId: existingAsset.fbAdId,
                    fbPageId: existingAsset.fbPageId,
                    brandName: existingAsset.brandName,
                    headline: existingAsset.headline,
                    cta: existingAsset.cta,
                    ctaUrl: existingAsset.ctaUrl,
                    adText: existingAsset.adText,
                    description: existingAsset.description,
                    adStatus: existingAsset.adStatus,
                    startDate: existingAsset.startDate,
                    endDate: existingAsset.endDate,
                    dateRange: existingAsset.dateRange,
                    platforms: existingAsset.platforms,
                    adUrl: existingAsset.adUrl,
                    media: existingAsset.files.map(f => ({ url: f.url, type: f.type })),
                    boardIds: [...existingBoardIds, ...newBoardIds],
                    runtimeDays: existingAsset.runtimeDays,
                    firstSeenDate: existingAsset.firstSeenDate,
                    lastSeenDate: existingAsset.lastSeenDate,
                    message: `Ad added to ${newBoardIds.length} new board(s) successfully!`
                })
            } else {
                // Ad already exists on all specified boards
                console.log('Returning 409 - Ad already on all specified boards')
                const errorResponse = {
                    error: 'Ad already exists on all specified boards',
                    details: 'This Facebook ad has already been added to all the specified boards.'
                }
                console.log('Error response object:', errorResponse)
                return NextResponse.json(errorResponse, { status: 409 }) // 409 Conflict
            }
        }

        // Use ad data provided by Chrome extension
        console.log('🎯 ASSETS/FB: Using ad data from Chrome extension for adId:', adId)

        // Handle brand data if provided
        let brandId = null
        let brandData = null
        const effectivePageId = adData.pageId || pageId // Use pageId from adData or fallback to top-level pageId
        if (effectivePageId && adData.brandName && adData.brandImageUrl) {
            console.log('🎯 ASSETS/FB: Processing brand data:', {
                pageId: effectivePageId,
                brandName: adData.brandName,
                hasImage: !!adData.brandImageUrl
            })

            // Check if brand already exists for this page ID and org
            let existingBrand = await prisma.brand.findUnique({
                where: {
                    fbPageId_orgId: {
                        fbPageId: effectivePageId,
                        orgId
                    }
                }
            })

            if (!existingBrand) {
                console.log('🎯 ASSETS/FB: Brand not found, creating new brand...')

                try {
                    // Upload brand image to Cloudinary
                    const brandImageResult = await uploadImageFromUrl(adData.brandImageUrl, {
                        orgId,
                        assetId: 'brand_' + effectivePageId
                    })

                    // Create new brand
                    existingBrand = await prisma.brand.create({
                        data: {
                            fbPageId: effectivePageId,
                            name: adData.brandName,
                            imageUrl: brandImageResult.secure_url,
                            cloudinaryId: brandImageResult.public_id,
                            orgId
                        }
                    })

                    console.log('✅ ASSETS/FB: Brand created successfully:', existingBrand.fbPageId)
                } catch (error) {
                    console.error('❌ ASSETS/FB: Failed to create brand:', error)
                    // Continue without brand if creation fails
                }
            } else {
                console.log('✅ ASSETS/FB: Found existing brand:', existingBrand.fbPageId)
            }

            if (existingBrand) {
                brandId = existingBrand.fbPageId
                brandData = {
                    fbPageId: existingBrand.fbPageId,
                    name: existingBrand.name,
                    imageUrl: existingBrand.imageUrl
                }
            }
        }

        const processedAdData = {
            fbAdId: adId,
            brandName: adData.brandName,
            headline: adData.headline || '',
            adText: adData.adText || '',
            description: adData.description || '',
            cta: adData.cta || '',
            ctaUrl: adData.ctaUrl || '',
            adStatus: adData.adStatus || '',
            startDate: adData.startDate || '',
            endDate: adData.endDate || '',
            dateRange: adData.dateRange || '',
            platforms: adData.platforms || [],
            adUrl: `https://www.facebook.com/ads/library/?id=${adId}`, // Construct URL from adId
            originalUrl: `https://www.facebook.com/ads/library/?id=${adId}`,
            firstSeenDate: adData.firstSeenDate ? new Date(adData.firstSeenDate) : undefined,
            lastSeenDate: adData.lastSeenDate ? new Date(adData.lastSeenDate) : undefined,
            fbPageId: effectivePageId || '',
            mediaDetails: adData.mediaDetails || []
        }

        console.log('🎯 ASSETS/FB: Processed ad data:', {
            fbAdId: processedAdData.fbAdId,
            brandName: processedAdData.brandName,
            headline: processedAdData.headline?.substring(0, 50) + '...',
            adTextLength: processedAdData.adText?.length,
            brandId: brandId
        })

        // Create asset record with data from Chrome extension
        const asset = await prisma.asset.create({
            data: {
                platform: 'facebook',
                fbAdId: processedAdData.fbAdId,
                fbPageId: processedAdData.fbPageId,
                adUrl: processedAdData.adUrl,
                headline: processedAdData.headline,
                cta: processedAdData.cta,
                ctaUrl: processedAdData.ctaUrl,
                brandName: processedAdData.brandName,
                adText: processedAdData.adText,
                description: processedAdData.description,
                adStatus: processedAdData.adStatus,
                startDate: processedAdData.startDate,
                endDate: processedAdData.endDate,
                dateRange: processedAdData.dateRange,
                platforms: processedAdData.platforms,
                firstSeenDate: processedAdData.firstSeenDate,
                lastSeenDate: processedAdData.lastSeenDate,
                runtimeDays: calculateRuntimeDays(processedAdData.firstSeenDate, processedAdData.lastSeenDate),
                createdById: userId,
                orgId
            }
        })

        // Store media files as URLs only (don't upload to Cloudinary)
        const storedFiles = []

        if (processedAdData.mediaDetails.length > 0) {
            for (let i = 0; i < processedAdData.mediaDetails.length; i++) {
                const mediaItem = processedAdData.mediaDetails[i]

                try {
                    // Store media file metadata in database WITHOUT uploading to Cloudinary
                    const assetFile = await prisma.assetFile.create({
                        data: {
                            assetId: asset.id,
                            type: mediaItem.type,
                            url: mediaItem.url, // Use original URL
                            cloudinaryId: `not_uploaded_${asset.id}_${i}_${mediaItem.source}`, // Mark as not uploaded
                            width: null,
                            height: null,
                            fileSize: null,
                            duration: null,
                            order: i
                        }
                    })

                    storedFiles.push({
                        url: assetFile.url,
                        type: assetFile.type,
                        source: mediaItem.source,
                        alt: mediaItem.alt || ''
                    })

                    console.log(`📁 Stored media file (not uploaded): ${mediaItem.type} - ${mediaItem.source}`)
                } catch (error) {
                    console.error(`❌ Failed to store media file ${mediaItem.url}:`, error)
                    // Continue with other files even if one fails
                }
            }

            console.log(`📁 Processed ${storedFiles.length} media files (stored as URLs, not uploaded to Cloudinary)`)
        }

        // Add to boards
        let finalBoardIds = [...boardIds]

        // If no boards specified, use default board
        if (finalBoardIds.length === 0) {
            // Find default board or create one
            const defaultBoard = await prisma.board.findFirst({
                where: {
                    orgId,
                    isDefault: true
                }
            })

            if (defaultBoard) {
                finalBoardIds = [defaultBoard.id]
            } else {
                const newBoard = await prisma.board.create({
                    data: {
                        name: 'My Ads',
                        description: 'Default board for saved ads',
                        isDefault: true,
                        orgId
                    }
                })
                finalBoardIds = [newBoard.id]
            }
        }

        // Create board-asset associations for all specified boards
        if (finalBoardIds.length > 0) {
            const boardAssetCreations = finalBoardIds.map(boardId => ({
                boardId,
                assetId: asset.id
            }))

            await prisma.boardAsset.createMany({
                data: boardAssetCreations
            })
        }

        // Add tags
        if (tags.length > 0) {
            for (const tagName of tags) {
                // Find or create tag
                let tag = await prisma.tag.findUnique({
                    where: {
                        name_orgId: {
                            name: tagName,
                            orgId
                        }
                    }
                })

                if (!tag) {
                    tag = await prisma.tag.create({
                        data: {
                            name: tagName,
                            orgId
                        }
                    })
                }

                // Link tag to asset
                await prisma.assetTag.create({
                    data: {
                        assetId: asset.id,
                        tagId: tag.id
                    }
                })
            }
        }

        // Log audit event
        await prisma.auditLog.create({
            data: {
                action: 'CREATE',
                resource: 'ASSET',
                resourceId: asset.id,
                userId,
                orgId,
                metadata: {
                    platform: 'facebook',
                    fbAdId: adId,
                    source: 'api'
                }
            }
        })

        const finalResponse = NextResponse.json({
            id: asset.id,
            fbAdId: asset.fbAdId,
            fbPageId: asset.fbPageId,
            brandName: asset.brandName,
            headline: asset.headline,
            cta: asset.cta,
            ctaUrl: asset.ctaUrl,
            adText: asset.adText,
            description: asset.description,
            adStatus: asset.adStatus,
            startDate: asset.startDate,
            endDate: asset.endDate,
            dateRange: asset.dateRange,
            platforms: asset.platforms,
            adUrl: asset.adUrl,
            media: storedFiles,
            boardIds: finalBoardIds,
            runtimeDays: asset.runtimeDays,
            firstSeenDate: asset.firstSeenDate,
            lastSeenDate: asset.lastSeenDate,
            brand: brandData,
            message: `Ad saved to ${finalBoardIds.length} board(s) successfully!`
        })

        // Log the final response for debugging
        console.log('🎯 ASSETS/FB: Final response data:', {
            assetId: asset.id,
            fbAdId: asset.fbAdId,
            fbPageId: asset.fbPageId,
            brandName: asset.brandName,
            brandData: brandData,
            mediaCount: storedFiles.length,
            boardCount: finalBoardIds.length
        })

        // Add CORS headers for Chrome extension
        const origin = req.headers.get('origin')
        if (origin && (origin.includes('facebook.com') || origin.startsWith('chrome-extension://'))) {
            finalResponse.headers.set('Access-Control-Allow-Origin', origin)
            finalResponse.headers.set('Access-Control-Allow-Credentials', 'true')
        }

        return finalResponse

    } catch (error) {
        console.error('🚨 ERROR in assets/fb endpoint:', error)
        console.error('🚨 Error stack:', error instanceof Error ? error.stack : 'No stack')

        if (error instanceof z.ZodError) {
            console.error('🚨 Zod validation error:', error.errors)
            return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
        }

        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}