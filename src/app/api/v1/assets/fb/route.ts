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
        fbAdId: z.string(),
        brandName: z.string(),
        headline: z.string().optional(),
        adText: z.string().optional(),
        description: z.string().optional(),
        cta: z.string().optional(),
        mediaDetails: z.array(z.object({
            url: z.string(),
            type: z.enum(['image', 'video']),
            source: z.string(), // e.g., 'video_src', 'video_poster', 'main_image'
            alt: z.string().optional(),
        })).optional().default([]),
        firstSeenDate: z.string().optional(), // ISO date string
        lastSeenDate: z.string().optional(), // ISO date string
    }),
})

export async function POST(req: NextRequest) {
    console.log('🚨 ASSETS/FB POST ENDPOINT HIT!')
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

        // Use fbAdId from the extracted adData
        const adId = adData.fbAdId
        console.log('✅ Using Facebook ad ID from extension:', adId)

        // Check if asset already exists for this org
        console.log('🚨 Checking if asset already exists for adId:', adId, 'orgId:', orgId)
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
                },
                tags: {
                    include: {
                        tag: true
                    }
                }
            }
        })

        if (existingAsset) {
            console.log('🚨 FOUND EXISTING ASSET:', {
                id: existingAsset.id,
                fbAdId: existingAsset.fbAdId,
                brandName: existingAsset.brandName,
                headline: existingAsset.headline,
                description: existingAsset.description
            })

            // Check which boards this ad is already on
            const existingBoardIds = existingAsset.boards.map(ba => ba.boardId)

            // SECURITY: Validate that all new boardIds belong to user's organization
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
                console.error('🚨 Invalid board IDs for existing asset:', invalidBoardIds)
                return NextResponse.json(
                    {
                        error: 'Invalid board access',
                        details: 'One or more boards do not exist or you do not have access to them.',
                        invalidBoardIds
                    },
                    { status: 403 }
                )
            }

            const newBoardIds = validBoardIds.filter(boardId => !existingBoardIds.includes(boardId))
            console.log('🚨 Existing boards:', existingBoardIds)
            console.log('🚨 New boards to add:', newBoardIds)

            if (newBoardIds.length > 0) {
                // Add to the new boards
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
                    adText: existingAsset.adText,
                    description: existingAsset.description,
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

        const processedAdData = {
            fbAdId: adData.fbAdId,
            brandName: adData.brandName,
            headline: adData.headline || '',
            adText: adData.adText || '',
            description: adData.description || '',
            cta: adData.cta || '',
            adUrl: `https://www.facebook.com/ads/library/?id=${adData.fbAdId}`, // Construct URL from fbAdId
            originalUrl: `https://www.facebook.com/ads/library/?id=${adData.fbAdId}`,
            firstSeenDate: adData.firstSeenDate ? new Date(adData.firstSeenDate) : undefined,
            lastSeenDate: adData.lastSeenDate ? new Date(adData.lastSeenDate) : undefined,
            fbPageId: pageId || '',
            mediaDetails: adData.mediaDetails || []
        }

        console.log('🎯 ASSETS/FB: Processed ad data:', {
            fbAdId: processedAdData.fbAdId,
            brandName: processedAdData.brandName,
            headline: processedAdData.headline?.substring(0, 50) + '...',
            adTextLength: processedAdData.adText?.length
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
                brandName: processedAdData.brandName,
                adText: processedAdData.adText,
                description: processedAdData.description,
                firstSeenDate: processedAdData.firstSeenDate,
                lastSeenDate: processedAdData.lastSeenDate,
                runtimeDays: calculateRuntimeDays(processedAdData.firstSeenDate, processedAdData.lastSeenDate),
                createdById: userId,
                orgId
            }
        })

        // Upload media files to Cloudinary using rich media details from Chrome extension
        const uploadedFiles = []

        if (processedAdData.mediaDetails.length > 0) {
            for (let i = 0; i < processedAdData.mediaDetails.length; i++) {
                const mediaItem = processedAdData.mediaDetails[i]

                try {
                    let uploadResult

                    // Upload to Cloudinary based on media type
                    if (mediaItem.type === 'video') {
                        uploadResult = await uploadVideoFromUrl(mediaItem.url, {
                            orgId,
                            assetId: asset.id
                        })
                    } else {
                        uploadResult = await uploadImageFromUrl(mediaItem.url, {
                            orgId,
                            assetId: asset.id
                        })
                    }

                    // Store uploaded file metadata in database
                    const assetFile = await prisma.assetFile.create({
                        data: {
                            assetId: asset.id,
                            type: mediaItem.type,
                            url: uploadResult.secure_url,
                            cloudinaryId: uploadResult.public_id,
                            width: uploadResult.width,
                            height: uploadResult.height,
                            fileSize: uploadResult.bytes,
                            duration: uploadResult.duration,
                            order: i
                        }
                    })

                    uploadedFiles.push({
                        url: assetFile.url,
                        type: assetFile.type,
                        source: mediaItem.source,
                        alt: mediaItem.alt || ''
                    })

                    console.log(`✅ Successfully uploaded ${mediaItem.type} to Cloudinary: ${uploadResult.public_id}`)
                } catch (error) {
                    console.error(`❌ Failed to upload media ${mediaItem.url}:`, error)

                    // Create a fallback entry with original URL if Cloudinary upload fails
                    const assetFile = await prisma.assetFile.create({
                        data: {
                            assetId: asset.id,
                            type: mediaItem.type,
                            url: mediaItem.url, // Fallback to original URL
                            cloudinaryId: `failed_upload_${asset.id}_${i}_${mediaItem.source}`,
                            width: null,
                            height: null,
                            fileSize: null,
                            duration: null,
                            order: i
                        }
                    })

                    uploadedFiles.push({
                        url: assetFile.url,
                        type: assetFile.type,
                        source: mediaItem.source,
                        alt: mediaItem.alt || ''
                    })

                    // Continue with other files even if one fails
                }
            }

            console.log(`📁 Processed ${uploadedFiles.length} media files (uploaded to Cloudinary where possible)`)
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
            adText: asset.adText,
            description: asset.description,
            adUrl: asset.adUrl,
            media: uploadedFiles,
            boardIds: finalBoardIds,
            runtimeDays: asset.runtimeDays,
            firstSeenDate: asset.firstSeenDate,
            lastSeenDate: asset.lastSeenDate,
            message: `Ad saved to ${finalBoardIds.length} board(s) successfully!`
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