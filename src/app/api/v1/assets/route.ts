import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedUser, getOrCreateDefaultOrg } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

const searchParamsSchema = z.object({
    platform: z.string().optional().default('facebook'),
    q: z.string().optional(), // search query
    tag: z.string().optional(), // filter by tag
    brandName: z.string().optional(), // filter by brand
    boardId: z.string().optional(), // filter by board
    sort: z.enum(['createdAt', 'firstSeenDate', 'lastSeenDate', 'brandName', 'headline']).optional().default('createdAt'),
    order: z.enum(['asc', 'desc']).optional().default('desc'),
    limit: z.coerce.number().min(1).max(100).optional().default(24),
    cursor: z.string().optional(), // pagination cursor
})

export async function GET(req: NextRequest) {
    try {
        // Authenticate user
        const authContext = await getAuthenticatedUser(req)
        if (!authContext) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { userId } = authContext

        // Get or create default organization
        const orgId = await getOrCreateDefaultOrg(userId)

        // Parse query parameters
        const { searchParams } = new URL(req.url)
        const {
            platform,
            q,
            tag,
            brandName,
            boardId,
            sort,
            order,
            limit,
            cursor
        } = searchParamsSchema.parse(Object.fromEntries(searchParams.entries()))

        // Build where clause
        const where: any = {
            orgId,
            platform
        }

        // Text search across multiple fields
        if (q) {
            where.OR = [
                { headline: { contains: q, mode: 'insensitive' } },
                { brandName: { contains: q, mode: 'insensitive' } },
                { adText: { contains: q, mode: 'insensitive' } },
                { cta: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } }
            ]
        }

        // Filter by brand name
        if (brandName) {
            where.brandName = { contains: brandName, mode: 'insensitive' }
        }

        // Filter by tag
        if (tag) {
            where.tags = {
                some: {
                    tag: {
                        name: { equals: tag, mode: 'insensitive' }
                    }
                }
            }
        }

        // Filter by board
        if (boardId) {
            where.boards = {
                some: {
                    boardId
                }
            }
        }

        // Pagination cursor
        if (cursor) {
            where.id = { lt: cursor }
        }

        // Build orderBy
        const orderBy: any = {}
        orderBy[sort] = order

        // Query assets
        const assets = await prisma.asset.findMany({
            where,
            include: {
                files: {
                    orderBy: { order: 'asc' }
                },
                tags: {
                    include: {
                        tag: {
                            select: { id: true, name: true, color: true }
                        }
                    }
                },
                boards: {
                    include: {
                        board: {
                            select: { id: true, name: true, color: true }
                        }
                    }
                },
                createdBy: {
                    select: { id: true, name: true, image: true }
                }
            },
            orderBy,
            take: limit + 1, // Take one extra to check if there are more results
        })

        // Check if there are more results
        const hasMore = assets.length > limit
        const results = hasMore ? assets.slice(0, limit) : assets

        // Format response
        const formattedAssets = results.map(asset => ({
            id: asset.id,
            platform: asset.platform,
            fbAdId: asset.fbAdId,
            fbPageId: asset.fbPageId,
            adUrl: asset.adUrl,
            headline: asset.headline,
            cta: asset.cta,
            brandName: asset.brandName,
            adText: asset.adText,
            description: asset.description,
            firstSeenDate: asset.firstSeenDate,
            lastSeenDate: asset.lastSeenDate,
            runtimeDays: asset.runtimeDays,
            notes: asset.notes,
            createdAt: asset.createdAt,
            updatedAt: asset.updatedAt,
            createdBy: asset.createdBy,
            files: asset.files.map(file => ({
                id: file.id,
                type: file.type,
                url: file.url,
                thumbnailUrl: file.thumbnailUrl,
                width: file.width,
                height: file.height,
                fileSize: file.fileSize,
                duration: file.duration
            })),
            tags: asset.tags.map(at => at.tag),
            boards: asset.boards.map(ba => ba.board)
        }))

        // Prepare pagination info
        const pagination = {
            hasMore,
            nextCursor: hasMore ? results[results.length - 1].id : null,
            count: results.length
        }

        return NextResponse.json({
            assets: formattedAssets,
            pagination
        })

    } catch (error) {
        console.error('Error searching assets:', error)

        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid query parameters', details: error.errors }, { status: 400 })
        }

        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}