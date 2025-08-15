import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedUser, getOrCreateDefaultOrg, checkOrgAccess } from '@/lib/auth-helpers'
// Use the working API endpoint approach instead
import { validateFacebookAdUrl, calculateRuntimeDays } from '@/lib/facebook-scraper'
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
    adUrl: z.string().url(),
    boardId: z.string().optional(),
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
        mediaUrls: z.array(z.string()).optional().default([]),
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
        const { adUrl, boardId, pageId, tags, adData } = createAssetSchema.parse(body)
        console.log('🚨 Parsed data - adUrl:', adUrl, 'boardId:', boardId, 'pageId:', pageId)
        console.log('🎯 Received ad data:', adData)

        // Validate Facebook ad URL
        const { isValid, adId } = validateFacebookAdUrl(adUrl)
        if (!isValid || !adId) {
            return NextResponse.json({ error: 'Invalid Facebook ad URL' }, { status: 400 })
        }

        // Get or create default organization
        const orgId = await getOrCreateDefaultOrg(userId)

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

            // Check if this ad is already on the specified board
            const isAlreadyOnBoard = boardId && existingAsset.boards.some(ba => ba.boardId === boardId)
            console.log('🚨 Is already on board?', isAlreadyOnBoard)

            if (boardId && !isAlreadyOnBoard) {
                // Add to the specified board
                await prisma.boardAsset.create({
                    data: {
                        boardId,
                        assetId: existingAsset.id
                    }
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
                    adUrl: existingAsset.adUrl,
                    media: existingAsset.files.map(f => ({ url: f.url, type: f.type })),
                    boardId: boardId,
                    runtimeDays: existingAsset.runtimeDays,
                    firstSeenDate: existingAsset.firstSeenDate,
                    lastSeenDate: existingAsset.lastSeenDate,
                    message: 'Ad added to board successfully!'
                })
            } else if (isAlreadyOnBoard) {
                // Ad already exists on this board
                console.log('Returning 409 - Ad already on board')
                const errorResponse = {
                    error: 'This ad is already in this board',
                    details: 'This Facebook ad has already been added to this board.'
                }
                console.log('Error response object:', errorResponse)
                return NextResponse.json(errorResponse, { status: 409 }) // 409 Conflict
            } else {
                // No board specified, ad exists elsewhere
                console.log('Returning 409 - Ad already exists')
                const errorResponse = {
                    error: 'Ad already exists',
                    details: 'This Facebook ad has already been saved to your organization.'
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
            adUrl: adUrl, // Use the original Facebook URL
            originalUrl: adUrl,
            firstSeenDate: adData.firstSeenDate ? new Date(adData.firstSeenDate) : undefined,
            lastSeenDate: adData.lastSeenDate ? new Date(adData.lastSeenDate) : undefined,
            fbPageId: pageId || '',
            mediaUrls: adData.mediaUrls || []
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

        // For now, store media URLs directly without Cloudinary upload
        // (Cloudinary integration comes next)
        const uploadedFiles = []
        if (processedAdData.mediaUrls.length > 0) {
            for (let i = 0; i < processedAdData.mediaUrls.length; i++) {
                const mediaUrl = processedAdData.mediaUrls[i]
                const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('video') || mediaUrl.includes('fbcdn') && mediaUrl.includes('v/')

                const assetFile = await prisma.assetFile.create({
                    data: {
                        assetId: asset.id,
                        type: isVideo ? 'video' : 'image',
                        url: mediaUrl,
                        cloudinaryId: `temp_${asset.id}_${i}`, // Temp ID until Cloudinary upload
                        width: null,
                        height: null,
                        fileSize: null,
                        duration: null,
                        order: i
                    }
                })

                uploadedFiles.push({
                    url: assetFile.url,
                    type: assetFile.type
                })
            }
        }

        // Add to board
        let targetBoardId = boardId
        if (!targetBoardId) {
            // Find default board or create one
            const defaultBoard = await prisma.board.findFirst({
                where: {
                    orgId,
                    isDefault: true
                }
            })

            if (defaultBoard) {
                targetBoardId = defaultBoard.id
            } else {
                const newBoard = await prisma.board.create({
                    data: {
                        name: 'My Ads',
                        description: 'Default board for saved ads',
                        isDefault: true,
                        orgId
                    }
                })
                targetBoardId = newBoard.id
            }
        }

        if (targetBoardId) {
            await prisma.boardAsset.create({
                data: {
                    boardId: targetBoardId,
                    assetId: asset.id
                }
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
            boardId: targetBoardId,
            runtimeDays: asset.runtimeDays,
            firstSeenDate: asset.firstSeenDate,
            lastSeenDate: asset.lastSeenDate
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