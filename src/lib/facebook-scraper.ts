import * as cheerio from 'cheerio'
import { z } from 'zod'

export interface FacebookAdData {
    fbAdId: string
    fbPageId?: string
    brandName?: string
    headline?: string
    cta?: string
    adText?: string
    description?: string
    mediaUrls: string[]
    firstSeenDate?: Date
    lastSeenDate?: Date
    adUrl: string
}

// Validate Facebook Ad Library URL
export function validateFacebookAdUrl(url: string): { isValid: boolean; adId?: string } {
    try {
        const urlObj = new URL(url)

        // Check if it's a Facebook Ad Library URL
        if (urlObj.hostname === 'www.facebook.com' && urlObj.pathname === '/ads/library/') {
            const adId = urlObj.searchParams.get('id')
            if (adId) {
                return { isValid: true, adId }
            }
        }

        // Check if it's a Facebook post URL that might contain ad info
        if (urlObj.hostname === 'www.facebook.com' || urlObj.hostname === 'facebook.com') {
            // Extract potential ad ID from various FB URL formats
            const pathMatch = urlObj.pathname.match(/\/(\d+)\//)
            if (pathMatch) {
                return { isValid: true, adId: pathMatch[1] }
            }
        }

        return { isValid: false }
    } catch {
        return { isValid: false }
    }
}

// Extract Facebook ad data from HTML
export async function scrapeFacebookAd(url: string): Promise<FacebookAdData> {
    try {
        // Validate URL first
        const { isValid, adId } = validateFacebookAdUrl(url)
        if (!isValid || !adId) {
            throw new Error('Invalid Facebook ad URL')
        }

        // Fetch the page HTML
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            },
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch Facebook ad: ${response.status}`)
        }

        const html = await response.text()
        const $ = cheerio.load(html)

        // Extract structured data from JSON-LD or meta tags
        let structuredData: any = {}

        // Look for JSON-LD structured data
        $('script[type="application/ld+json"]').each((_, elem) => {
            try {
                const data = JSON.parse($(elem).html() || '{}')
                if (data['@type'] === 'WebPage' || data.advertisement) {
                    structuredData = { ...structuredData, ...data }
                }
            } catch { }
        })

        // Extract from meta tags
        const getMetaContent = (property: string) => {
            return $(`meta[property="${property}"]`).attr('content') ||
                $(`meta[name="${property}"]`).attr('content') || ''
        }

        // Extract ad data
        const adData: FacebookAdData = {
            fbAdId: adId,
            adUrl: url,
            mediaUrls: [],
        }

        // Try to extract brand name from various sources
        adData.brandName =
            getMetaContent('og:site_name') ||
            getMetaContent('twitter:site') ||
            $('[data-testid="page_name"]').text().trim() ||
            $('.page-name').text().trim() ||
            $('h1').first().text().trim()

        // Extract headline/title
        adData.headline =
            getMetaContent('og:title') ||
            getMetaContent('twitter:title') ||
            $('[data-testid="ad_creative_title"]').text().trim() ||
            $('.ad-creative-title').text().trim() ||
            $('h2').first().text().trim()

        // Extract description/ad text
        adData.adText =
            getMetaContent('og:description') ||
            getMetaContent('twitter:description') ||
            $('[data-testid="ad_creative_body"]').text().trim() ||
            $('.ad-creative-body').text().trim() ||
            $('p').first().text().trim()

        // Extract CTA
        adData.cta =
            $('[data-testid="cta_button"]').text().trim() ||
            $('.cta-button').text().trim() ||
            $('button').first().text().trim() ||
            $('[role="button"]').first().text().trim()

        // Extract media URLs
        const mediaUrls: string[] = []

        // Look for images
        $('img').each((_, elem) => {
            const src = $(elem).attr('src')
            if (src && (src.includes('scontent') || src.includes('fbcdn'))) {
                // Clean up Facebook image URLs
                const cleanUrl = src.split('?')[0] // Remove query params
                if (!mediaUrls.includes(cleanUrl)) {
                    mediaUrls.push(cleanUrl)
                }
            }
        })

        // Look for videos
        $('video').each((_, elem) => {
            const src = $(elem).attr('src') || $(elem).find('source').attr('src')
            if (src && (src.includes('scontent') || src.includes('fbcdn'))) {
                const cleanUrl = src.split('?')[0]
                if (!mediaUrls.includes(cleanUrl)) {
                    mediaUrls.push(cleanUrl)
                }
            }
        })

        // Also check meta tags for media
        const ogImage = getMetaContent('og:image')
        if (ogImage && !mediaUrls.includes(ogImage)) {
            mediaUrls.push(ogImage)
        }

        const ogVideo = getMetaContent('og:video')
        if (ogVideo && !mediaUrls.includes(ogVideo)) {
            mediaUrls.push(ogVideo)
        }

        adData.mediaUrls = mediaUrls

        // Try to extract dates if available
        const dateRegex = /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/g
        const pageText = $('body').text()
        const dateMatches = pageText.match(dateRegex)

        if (dateMatches && dateMatches.length > 0) {
            try {
                adData.firstSeenDate = new Date(dateMatches[0])
                if (dateMatches.length > 1) {
                    adData.lastSeenDate = new Date(dateMatches[dateMatches.length - 1])
                }
            } catch { }
        }

        // Extract page ID if possible
        const pageIdMatch = html.match(/"page_id":"(\d+)"/) || html.match(/page_id=(\d+)/)
        if (pageIdMatch) {
            adData.fbPageId = pageIdMatch[1]
        }

        return adData
    } catch (error) {
        console.error('Error scraping Facebook ad:', error)
        throw new Error('Failed to scrape Facebook ad data')
    }
}

// Fallback method using Facebook Graph API (if available)
export async function fetchFacebookAdViaAPI(adId: string): Promise<Partial<FacebookAdData>> {
    // This would require Facebook API access token
    // For now, return empty data as fallback
    console.log('Facebook API method not implemented yet for ad:', adId)
    return {
        fbAdId: adId,
        mediaUrls: [],
    }
}

// Utility to calculate runtime days
export function calculateRuntimeDays(firstSeen?: Date, lastSeen?: Date): number | undefined {
    if (!firstSeen || !lastSeen) return undefined

    const diffTime = Math.abs(lastSeen.getTime() - firstSeen.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
}