import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedUser, getOrCreateDefaultOrg, checkOrgAccess } from '@/lib/auth-helpers'
import { scrapeFacebookAd, validateFacebookAdUrl, calculateRuntimeDays } from '@/lib/facebook-scraper'
import { uploadImageFromUrl, uploadVideoFromUrl } from '@/lib/cloudinary'
import { prisma } from '@/lib/prisma'

const createAssetSchema = z.object({
    adUrl: z.string().url(),
    boardId: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
})

export async function POST(req: NextRequest) {
    try {
        // Authenticate user
        const authContext = await getAuthenticatedUser(req)
        if (!authContext) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { user, userId } = authContext

        // Parse request body
        const body = await req.json()
        const { adUrl, boardId, tags } = createAssetSchema.parse(body)

        // Validate Facebook ad URL
        const { isValid, adId } = validateFacebookAdUrl(adUrl)
        if (!isValid || !adId) {
            return NextResponse.json({ error: 'Invalid Facebook ad URL' }, { status: 400 })
        }

        // Get or create default organization
        const orgId = await getOrCreateDefaultOrg(userId)

        // Check if asset already exists for this org
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
            // If boardId is specified and asset isn't on that board, add it
            if (boardId && !existingAsset.boards.some(ba => ba.boardId === boardId)) {
                await prisma.boardAsset.create({
                    data: {
                        boardId,
                        assetId: existingAsset.id
                    }
                })
            }

            return NextResponse.json({
                id: existingAsset.id,
                fbAdId: existingAsset.fbAdId,
                brandName: existingAsset.brandName,
                headline: existingAsset.headline,
                cta: existingAsset.cta,
                media: existingAsset.files.map(f => ({ url: f.url, type: f.type })),
                boardId: boardId || existingAsset.boards[0]?.boardId,
                message: 'Asset already exists'
            })
        }

        // Scrape Facebook ad data
        const adData = await scrapeFacebookAd(adUrl)

        // Create asset record
        const asset = await prisma.asset.create({
            data: {
                platform: 'facebook',
                fbAdId: adData.fbAdId,
                fbPageId: adData.fbPageId,
                adUrl: adData.adUrl,
                headline: adData.headline,
                cta: adData.cta,
                brandName: adData.brandName,
                adText: adData.adText,
                description: adData.description,
                firstSeenDate: adData.firstSeenDate,
                lastSeenDate: adData.lastSeenDate,
                runtimeDays: calculateRuntimeDays(adData.firstSeenDate, adData.lastSeenDate),
                createdById: userId,
                orgId
            }
        })

        // Upload media files to Cloudinary
        const uploadedFiles = []
        for (let i = 0; i < adData.mediaUrls.length; i++) {
            const mediaUrl = adData.mediaUrls[i]
            try {
                const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('video')
                let uploadResult

                if (isVideo) {
                    uploadResult = await uploadVideoFromUrl(mediaUrl, {
                        orgId,
                        assetId: asset.id
                    })
                } else {
                    uploadResult = await uploadImageFromUrl(mediaUrl, {
                        orgId,
                        assetId: asset.id
                    })
                }

                const assetFile = await prisma.assetFile.create({
                    data: {
                        assetId: asset.id,
                        type: isVideo ? 'video' : 'image',
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
                    type: assetFile.type
                })
            } catch (error) {
                console.error(`Failed to upload media ${mediaUrl}:`, error)
                // Continue with other files even if one fails
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
                    fbAdId: adData.fbAdId,
                    source: 'api'
                }
            }
        })

        return NextResponse.json({
            id: asset.id,
            fbAdId: asset.fbAdId,
            brandName: asset.brandName,
            headline: asset.headline,
            cta: asset.cta,
            media: uploadedFiles,
            boardId: targetBoardId
        })

    } catch (error) {
        console.error('Error creating Facebook ad asset:', error)

        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
        }

        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}