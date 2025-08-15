// AdBoard Chrome Extension - Content Script
// Clean restart - focused on detecting individual ad cards

class AdBoardSaver {
    constructor() {
        this.adboardUrl = 'http://localhost:3000' // Change for production
        this.injectedAds = new Set() // Track processed ads
        this.init()
    }

    init() {
        // Only run on Facebook Ad Library pages
        if (!this.isAdLibraryPage()) {
            console.log('🚫 AdBoard: Not a Facebook Ad Library page, exiting')
            return
        }

        console.log('🎯 AdBoard: Facebook Ad Library page detected')
        console.log('🔍 Current URL:', window.location.href)

        // Wait for page to load, then start detection
        setTimeout(() => {
            console.log('🔄 AdBoard: Starting clean ad detection...')
            this.detectAndLogAdCards()
        }, 3000)

        // Observe for new content
        this.observeNewAds()
    }

    isAdLibraryPage() {
        return window.location.hostname === 'www.facebook.com' &&
            window.location.pathname.startsWith('/ads/library')
    }

    detectAndLogAdCards() {
        console.log('🔍 AdBoard: Starting ad card detection...')

        // Strategy: Look for containers that have BOTH Library ID and are reasonable sized
        const allDivs = document.querySelectorAll('div')
        console.log(`📊 Total divs on page: ${allDivs.length}`)

        const potentialAdCards = []

        allDivs.forEach((div, index) => {
            const text = div.textContent || ''

            // Look for Library ID pattern (primary indicator)
            const libraryIdMatch = text.match(/Library ID:\s*(\d+)/)

            // Also look for sponsored ads without Library ID (image-only ads)
            const hasSponsored = text.includes('Sponsored')
            const hasSeeAdDetails = text.includes('See ad details')
            const hasActive = text.includes('Active')
            const hasImages = div.querySelectorAll('img[src*="fbcdn"], img[src*="scontent"]').length > 0

            let libraryId = null
            let isValidAd = false

            if (libraryIdMatch) {
                // Primary: Library ID ads
                libraryId = libraryIdMatch[1]
                isValidAd = true
            } else if (hasSponsored && hasImages && (hasSeeAdDetails || hasActive)) {
                // Secondary: Sponsored image ads
                libraryId = `sponsored_${this.hashCode(text.substring(0, 200))}_${Date.now()}`
                isValidAd = true
            }

            if (isValidAd && libraryId) {
                // Make sure this div is a reasonable size (not a tiny nested element)
                const rect = div.getBoundingClientRect()
                const hasGoodSize = rect.width > 300 && rect.height > 200

                // Make sure it's not a duplicate (same ID already processed)
                const isUnique = !potentialAdCards.some(card => card.libraryId === libraryId)

                if (hasGoodSize && isUnique) {
                    const adCard = this.analyzeAdCard(div, libraryId)
                    potentialAdCards.push(adCard)
                }
            }
        })

        console.log(`✅ AdBoard: Found ${potentialAdCards.length} unique ad cards`)

        // For now, just log them. In next iteration we'll inject buttons
        potentialAdCards.forEach((card, index) => {
            console.log(`📝 Ad Card ${index + 1}:`, {
                libraryId: card.libraryId,
                brandName: card.brandName,
                adTextLength: card.adText.length,
                adTextPreview: card.adText.substring(0, 100) + (card.adText.length > 100 ? '...' : ''),
                mediaUrls: card.mediaUrls.slice(0, 3), // First 3 media URLs
                mediaCount: card.mediaUrls.length
            })
        })

        return potentialAdCards
    }

    analyzeAdCard(container, libraryId) {
        const text = container.textContent || ''

        // Extract brand name using Facebook-specific selectors
        let brandName = ''

        // Look for brand name in Facebook's specific structure
        const brandElement = container.querySelector('a[target="_blank"][href*="facebook.com"] span.x8t9es0.x1fvot60.xxio538.x108nfp6.xq9mrsl.x1h4wwuj.x117nqv4.xeuugli')
        if (brandElement) {
            brandName = brandElement.textContent?.trim() || ''
        }

        // Fallback brand name extraction
        if (!brandName) {
            const fallbackSelectors = [
                'a[href*="facebook.com"] span', // Any span inside Facebook links
                'img[alt]', // Image alt text
                'strong', 'b', 'h1', 'h2', 'h3'
            ]

            for (const selector of fallbackSelectors) {
                const elements = container.querySelectorAll(selector)
                for (const element of elements) {
                    const elementText = (element.textContent || element.getAttribute('alt') || '').trim()
                    if (elementText && elementText.length > 1 && elementText.length < 50 &&
                        !elementText.includes('Library ID') && !elementText.includes('Sponsored') &&
                        !elementText.includes('ads') && !elementText.match(/^\d/)) {
                        brandName = elementText
                        break
                    }
                }
                if (brandName) break
            }
        }

        // Extract ad text from specific Facebook ad text containers
        let adText = ''

        // Look for ad text in Facebook's ad copy containers
        const adTextSelectors = [
            'div[style*="white-space: pre-wrap"] span', // Main ad copy
            'div[tabindex="0"][role="button"] div span', // Alternative ad copy structure
            'span[style*="white-space"]', // Any span with white-space styling
            'div._4ik4 span' // Facebook's text container class
        ]

        for (const selector of adTextSelectors) {
            const elements = container.querySelectorAll(selector)
            for (const element of elements) {
                const elementText = element.textContent?.trim() || ''
                // Look for substantial text that doesn't contain metadata
                if (elementText && elementText.length > 20 && elementText.length < 1000 &&
                    !elementText.includes('Library ID') && !elementText.includes('Sponsored') &&
                    !elementText.includes('Started running') && !elementText.includes('See ad details') &&
                    !elementText.includes('This ad has') && !elementText.match(/^\d+\s+ads/)) {
                    adText = elementText
                    break
                }
            }
            if (adText) break
        }

        // Extract images and videos - prioritize content media over profile images
        const mediaUrls = []

        // First, look for videos (main content)
        const videos = container.querySelectorAll('video')
        videos.forEach(video => {
            // Video source
            if (video.src && (video.src.includes('fbcdn') || video.src.includes('video'))) {
                mediaUrls.push({
                    url: video.src,
                    type: 'video',
                    source: 'video_src'
                })
            }
            // Video poster (thumbnail)
            if (video.poster && video.poster.includes('fbcdn')) {
                mediaUrls.push({
                    url: video.poster,
                    type: 'image',
                    source: 'video_poster'
                })
            }
        })

        // Then look for main content images (skip tiny profile pics)
        const images = container.querySelectorAll('img')
        images.forEach(img => {
            if (img.src && (img.src.includes('fbcdn') || img.src.includes('scontent'))) {
                // Skip small profile images and icons
                const isSmallImage = img.src.includes('s60x60') ||
                    img.src.includes('s40x40') ||
                    img.src.includes('s32x32') ||
                    img.offsetWidth < 100 ||
                    img.offsetHeight < 100

                if (!isSmallImage) {
                    mediaUrls.push({
                        url: img.src,
                        type: 'image',
                        source: 'main_image',
                        alt: img.alt || ''
                    })
                }
            }
        })

        // Extract just the URLs for backward compatibility
        const mediaUrlList = mediaUrls.map(media => media.url)

        // Check for various elements
        const hasImages = images.length > 0
        const hasVideos = videos.length > 0
        const hasButtons = container.querySelectorAll('button, [role="button"], a[href]').length > 0
        const hasSponsored = text.includes('Sponsored')
        const hasSeeAdDetails = text.includes('See ad details')

        const result = {
            libraryId,
            container,
            brandName,
            adText,
            mediaUrls: mediaUrlList,
            mediaDetails: mediaUrls, // Keep detailed info for debugging
            hasImages,
            hasVideos,
            hasButtons,
            hasSponsored,
            hasSeeAdDetails,
            size: container.getBoundingClientRect()
        }

        console.log('📝 Analyzed ad card:', {
            libraryId,
            brandName,
            adTextLength: adText.length,
            adText: adText,
            mediaCount: mediaUrlList.length,
            mediaTypes: mediaUrls.map(m => `${m.type}(${m.source})`).join(', '),
            mainMediaUrl: mediaUrlList[0] || 'none',
            hasSponsored,
            hasSeeAdDetails
        })

        return result
    }

    observeNewAds() {
        // Simple observer for new content
        let debounceTimer = null

        const observer = new MutationObserver(() => {
            clearTimeout(debounceTimer)
            debounceTimer = setTimeout(() => {
                console.log('🔄 AdBoard: Page changed, re-detecting ads...')
                this.detectAndLogAdCards()
            }, 2000)
        })

        observer.observe(document.body, {
            childList: true,
            subtree: true
        })

        console.log('👀 AdBoard: Observer set up for dynamic content')
    }
    hashCode(str) {
        let hash = 0
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i)
            hash = ((hash << 5) - hash) + char
            hash = hash & hash // Convert to 32-bit integer
        }
        return hash
    }
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new AdBoardSaver())
} else {
    new AdBoardSaver()
}
