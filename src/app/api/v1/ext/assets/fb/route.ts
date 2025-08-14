import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserFromToken, checkOrgAccess } from '@/lib/auth-helpers'
import { scrapeFacebookAd, validateFacebookAdUrl, calculateRuntimeDays } from '@/lib/facebook-scraper'
import { uploadImageFromUrl, uploadVideoFromUrl } from '@/lib/cloudinary'
import { prisma } from '@/lib/prisma'

const createAssetSchema = z.object({
    adUrl: z.string().url(),
    boardId: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
    orgId: z.string().optional(),
})

export async function POST(req: NextRequest) {
    try {
        // Authenticate via personal access token (required for extension)
        const authContext = await getUserFromToken(req)
        if (!authContext) {
            return NextResponse.json({ error: 'Invalid or missing access token' }, { status: 401 })
        }

        const { user, userId } = authContext

        // Parse request body
        const body = await req.json()
        const { adUrl, boardId, tags, orgId } = createAssetSchema.parse(body)

        // Validate Facebook ad URL
        const { isValid, adId } = validateFacebookAdUrl(adUrl)
        if (!isValid || !adId) {
            return NextResponse.json({ error: 'Invalid Facebook ad URL' }, { status: 400 })
        }

        // Determine target organization
        let targetOrgId = orgId
        if (!targetOrgId) {
            // Get user's default organization
            const membership = await prisma.membership.findFirst({
                where: { userId },
                include: { org: true },
                orderBy: { org: { createdAt: 'asc' } }
            })

            if (!membership) {
                return NextResponse.json({ error: 'No organization found' }, { status: 400 })
            }

            targetOrgId = membership.orgId
        } else {
            // Check if user has access to specified org
            const hasAccess = await checkOrgAccess(userId, targetOrgId)
            if (!hasAccess) {
                return NextResponse.json({ error: 'Access denied to organization' }, { status: 403 })
            }
        }

        // Check if asset already exists for this org
        const existingAsset = await prisma.asset.findUnique({
            where: {
                fbAdId_orgId: {
                    fbAdId: adId,
                    orgId: targetOrgId
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
                // Verify board belongs to the org
                const board = await prisma.board.findFirst({
                    where: {
                        id: boardId,
                        orgId: targetOrgId
                    }
                })

                if (board) {
                    await prisma.boardAsset.create({
                        data: {
                            boardId,
                            assetId: existingAsset.id
                        }
                    })
                }
            }

            return NextResponse.json({
                id: existingAsset.id,
                fbAdId: existingAsset.fbAdId,
                brandName: existingAsset.brandName,
                headline: existingAsset.headline,
                cta: existingAsset.cta,
                media: existingAsset.files.map(f => ({ url: f.url, type: f.type })),
                boardId: boardId || existingAsset.boards[0]?.boardId,
                message: 'Asset already exists',
                status: 'existing'
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
                orgId: targetOrgId
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
                        orgId: targetOrgId,
                        assetId: asset.id
                    })
                } else {
                    uploadResult = await uploadImageFromUrl(mediaUrl, {
                        orgId: targetOrgId,
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
            // Find default board
            const defaultBoard = await prisma.board.findFirst({
                where: {
                    orgId: targetOrgId,
                    isDefault: true
                }
            })

            if (defaultBoard) {
                targetBoardId = defaultBoard.id
            } else {
                // Create a default board
                const newBoard = await prisma.board.create({
                    data: {
                        name: 'Extension Saves',
                        description: 'Ads saved via Chrome extension',
                        isDefault: true,
                        orgId: targetOrgId
                    }
                })
                targetBoardId = newBoard.id
            }
        } else {
            // Verify board belongs to the org
            const board = await prisma.board.findFirst({
                where: {
                    id: boardId,
                    orgId: targetOrgId
                }
            })

            if (!board) {
                return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
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
                            orgId: targetOrgId
                        }
                    }
                })

                if (!tag) {
                    tag = await prisma.tag.create({
                        data: {
                            name: tagName,
                            orgId: targetOrgId
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
                orgId: targetOrgId,
                metadata: {
                    platform: 'facebook',
                    fbAdId: adData.fbAdId,
                    source: 'extension'
                }
            }
        })

        return NextResponse.json({
            id: asset.id,
            fbAdId: asset.fbAdId,
            brandName: asset.brandName,
            headline: asset.headline,
            cta: asset.cta,
            adText: asset.adText,
            media: uploadedFiles,
            boardId: targetBoardId,
            status: 'created'
        })

    } catch (error) {
        console.error('Error creating Facebook ad asset via extension:', error)

        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
        }

        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}