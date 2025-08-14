import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

export interface CloudinaryUploadResult {
    public_id: string
    secure_url: string
    width: number
    height: number
    bytes: number
    format: string
    resource_type: string
    duration?: number
}

export async function uploadImageFromUrl(
    imageUrl: string,
    options: {
        orgId: string
        assetId: string
        folder?: string
    }
): Promise<CloudinaryUploadResult> {
    const folderPath = `${options.orgId}/${options.assetId}`

    try {
        const result = await cloudinary.uploader.upload(imageUrl, {
            folder: folderPath,
            resource_type: 'auto',
            transformation: [
                {
                    quality: 'auto:good',
                    fetch_format: 'auto',
                },
            ],
        })

        return result as CloudinaryUploadResult
    } catch (error) {
        console.error('Cloudinary upload error:', error)
        throw new Error('Failed to upload image to Cloudinary')
    }
}

export async function uploadVideoFromUrl(
    videoUrl: string,
    options: {
        orgId: string
        assetId: string
        folder?: string
    }
): Promise<CloudinaryUploadResult> {
    const folderPath = `${options.orgId}/${options.assetId}`

    try {
        const result = await cloudinary.uploader.upload(videoUrl, {
            folder: folderPath,
            resource_type: 'video',
            transformation: [
                {
                    quality: 'auto:good',
                    fetch_format: 'auto',
                },
            ],
        })

        return result as CloudinaryUploadResult
    } catch (error) {
        console.error('Cloudinary video upload error:', error)
        throw new Error('Failed to upload video to Cloudinary')
    }
}

export function getImageUrl(publicId: string, transformations?: any): string {
    return cloudinary.url(publicId, {
        transformation: [
            {
                width: 400,
                height: 400,
                crop: 'fill',
                quality: 'auto',
                fetch_format: 'auto',
            },
            ...(transformations || []),
        ],
    })
}

export function getThumbnailUrl(publicId: string): string {
    return cloudinary.url(publicId, {
        transformation: [
            {
                width: 200,
                height: 200,
                crop: 'fill',
                quality: 'auto:low',
                fetch_format: 'auto',
            },
        ],
    })
}

export function getVideoThumbnailUrl(publicId: string): string {
    return cloudinary.url(publicId, {
        resource_type: 'video',
        transformation: [
            {
                width: 400,
                height: 400,
                crop: 'fill',
                quality: 'auto',
                format: 'jpg',
                start_offset: '0',
            },
        ],
    })
}

export { cloudinary }