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

        console.log(`Scraping Facebook ad: ${url}`)

        // Fetch the page HTML
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
            },
        })

        if (!response.ok) {
            console.error(`Failed to fetch Facebook ad: ${response.status} ${response.statusText}`)
            // For development, create a fallback response
            return createFallbackAdData(adId, url)
        }

        const html = await response.text()
        const $ = cheerio.load(html)

        console.log(`Fetched HTML content (${html.length} chars)`)

        // Log a sample of the HTML to help debug
        console.log('HTML sample:', html.substring(0, 500))

        // Try to detect if we're being blocked or redirected
        if (html.includes('Please log in') || html.includes('login') || html.length < 1000) {
            console.log('Detected login requirement or minimal content, using fallback')
            return createFallbackAdData(adId, url)
        }

        // Check for specific Facebook blocking patterns
        if (html.includes('blocked') || html.includes('not available') || html.includes('error')) {
            console.log('Detected potential blocking, but attempting extraction anyway')
        }

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

        // Extract ad data using improved selectors
        const adData: FacebookAdData = {
            fbAdId: adId,
            adUrl: url,
            mediaUrls: [],
        }

        // Enhanced extraction with updated Facebook Ad Library selectors

        // Brand name extraction - updated selectors for 2024
        adData.brandName =
            $('div[role="main"] h1').first().text().trim() ||
            $('a[role="link"] span').filter((_, el) => $(el).text().length > 3).first().text().trim() ||
            $('[data-testid="page_name"]').text().trim() ||
            $('span').filter((_, el) => {
                const text = $(el).text().trim()
                return text.length > 3 && text.length < 50 && /^[A-Z]/.test(text)
            }).first().text().trim() ||
            getMetaContent('og:site_name') ||
            $('h3, h2, h1').filter((_, el) => $(el).text().trim().length > 0).first().text().trim()

        // Headline extraction - look for ad creative text
        adData.headline =
            $('div').filter((_, el) => {
                const text = $(el).text().trim()
                return text.length > 10 && text.length < 200 &&
                    !text.includes('Started running on') &&
                    !text.includes('See ad details') &&
                    !text.includes('Report ad')
            }).first().text().trim() ||
            getMetaContent('og:title') ||
            $('span').filter((_, el) => {
                const text = $(el).text().trim()
                return text.length > 20 && text.length < 150
            }).first().text().trim()

        // Ad text/description - look for longer text content
        adData.adText =
            $('div').filter((_, el) => {
                const text = $(el).text().trim()
                return text.length > 20 && text.length < 500 &&
                    !text.includes('Started running on') &&
                    !text.includes('See ad details') &&
                    !text.includes('Report ad') &&
                    !text.includes('Ad transparency')
            }).slice(0, 3).map((_, el) => $(el).text().trim()).get().join(' ').substring(0, 300) ||
            getMetaContent('og:description') ||
            $('p').filter((_, el) => $(el).text().trim().length > 10).first().text().trim()

        // Call-to-action button - look for button-like elements
        adData.cta =
            $('div[role="button"]').filter((_, el) => {
                const text = $(el).text().trim()
                return text.length > 0 && text.length < 30
            }).first().text().trim() ||
            $('span').filter((_, el) => {
                const text = $(el).text().trim()
                const buttonWords = ['Learn More', 'Shop Now', 'Sign Up', 'Download', 'Get', 'Buy', 'Order', 'Book', 'Start', 'Try', 'Call']
                return buttonWords.some(word => text.includes(word))
            }).first().text().trim()

        // Enhanced media extraction
        const mediaUrls: string[] = []

        // Look for Facebook CDN images and videos
        $('img, video').each((_, elem) => {
            const src = $(elem).attr('src') || $(elem).attr('data-src') || $(elem).find('source').attr('src')
            if (src) {
                // Facebook CDN patterns
                if (src.includes('scontent') || src.includes('fbcdn') || src.includes('facebook.com')) {
                    // Clean URL and convert to higher quality if possible
                    let cleanUrl = src.split('?')[0]
                    // Try to get higher quality version
                    if (cleanUrl.includes('_s.')) {
                        cleanUrl = cleanUrl.replace('_s.', '_o.')
                    }
                    if (!mediaUrls.includes(cleanUrl)) {
                        mediaUrls.push(cleanUrl)
                    }
                }
            }
        })

        // Check for background images in style attributes
        $('[style*="background-image"]').each((_, elem) => {
            const style = $(elem).attr('style') || ''
            const bgImageMatch = style.match(/background-image:\s*url\(["']?([^"')]+)["']?\)/)
            if (bgImageMatch && bgImageMatch[1]) {
                const src = bgImageMatch[1]
                if (src.includes('scontent') || src.includes('fbcdn')) {
                    if (!mediaUrls.includes(src)) {
                        mediaUrls.push(src)
                    }
                }
            }
        })

        // Meta tag fallbacks
        const ogImage = getMetaContent('og:image')
        if (ogImage && !mediaUrls.includes(ogImage)) {
            mediaUrls.push(ogImage)
        }

        const ogVideo = getMetaContent('og:video')
        if (ogVideo && !mediaUrls.includes(ogVideo)) {
            mediaUrls.push(ogVideo)
        }

        adData.mediaUrls = mediaUrls

        // Date extraction - look for "Started running on" pattern
        const dateTexts = [
            'Started running on',
            'First seen',
            'Last seen',
            'Active since'
        ]

        dateTexts.forEach(dateText => {
            const regex = new RegExp(dateText + '\\s+([A-Za-z]+ \\d{1,2}, \\d{4})', 'i')
            const match = html.match(regex)
            if (match) {
                try {
                    const date = new Date(match[1])
                    if (!adData.firstSeenDate) {
                        adData.firstSeenDate = date
                    }
                } catch { }
            }
        })

        // Extract page ID from various sources
        const pageIdMatches = [
            html.match(/"page_id":"(\d+)"/),
            html.match(/page_id=(\d+)/),
            html.match(/"pageID":"(\d+)"/),
            html.match(/\/pages\/[^\/]+\/(\d+)/)
        ]

        for (const match of pageIdMatches) {
            if (match && match[1]) {
                adData.fbPageId = match[1]
                break
            }
        }

        console.log('Extracted ad data:', {
            brandName: adData.brandName,
            headline: adData.headline,
            adText: adData.adText?.substring(0, 100),
            cta: adData.cta,
            mediaCount: adData.mediaUrls.length,
            pageId: adData.fbPageId
        })

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

// Create fallback ad data when scraping fails
function createFallbackAdData(adId: string, url: string): FacebookAdData {
    console.log('Creating fallback ad data for:', adId)

    // Try to extract any useful info from the URL parameters
    const urlParams = new URLSearchParams(url.split('?')[1] || '')
    const searchQuery = urlParams.get('search_text') || ''
    const adLibraryId = urlParams.get('id') || adId

    return {
        fbAdId: adId,
        adUrl: url,
        brandName: 'Facebook Advertiser',
        headline: searchQuery ? `Ad: ${searchQuery}` : `Facebook Ad Library ID: ${adLibraryId}`,
        adText: 'This Facebook ad was captured from the Ad Library. Facebook\'s privacy settings prevented full content extraction, but the ad has been saved for reference.',
        description: 'Content extraction was limited due to Facebook\'s access restrictions. You can view the full ad by visiting the original URL.',
        cta: 'View on Facebook',
        mediaUrls: [],
        firstSeenDate: new Date(),
        lastSeenDate: new Date()
    }
}

// Utility to calculate runtime days
export function calculateRuntimeDays(firstSeen?: Date, lastSeen?: Date): number | undefined {
    if (!firstSeen || !lastSeen) return undefined

    const diffTime = Math.abs(lastSeen.getTime() - firstSeen.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
}