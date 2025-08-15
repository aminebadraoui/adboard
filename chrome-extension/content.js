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

        // Log detected ads and inject save buttons
        potentialAdCards.forEach((card, index) => {
            console.log(`📝 Ad Card ${index + 1}:`, {
                libraryId: card.libraryId,
                brandName: card.brandName,
                adTextLength: card.adText.length,
                adText: card.adText,
                mediaCount: card.mediaDetails.length,
                mediaTypes: card.mediaDetails.map(m => `${m.type}(${m.source})`).join(', '),
                mainMediaUrl: card.mediaDetails[0]?.url || 'none',
                hasSponsored: card.hasSponsored,
                hasSeeAdDetails: card.hasSeeAdDetails
            })

            // Inject save button for this ad card
            this.injectSaveButton(card)
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
                // Skip small profile images and icons based on URL patterns
                const isSmallImage = img.src.includes('_s60x60') ||
                    img.src.includes('_s40x40') ||
                    img.src.includes('_s32x32') ||
                    img.src.includes('s60x60_') ||
                    img.src.includes('s40x40_') ||
                    img.src.includes('s32x32_')

                // Get actual image dimensions from URL if available
                const urlSizeMatch = img.src.match(/s(\d+)x(\d+)/)
                let isLargeEnough = true
                if (urlSizeMatch) {
                    const width = parseInt(urlSizeMatch[1])
                    const height = parseInt(urlSizeMatch[2])
                    isLargeEnough = width >= 200 || height >= 200
                } else {
                    // Fallback to DOM dimensions if no URL size info
                    isLargeEnough = img.offsetWidth >= 100 || img.offsetHeight >= 100
                }

                if (!isSmallImage && isLargeEnough) {
                    mediaUrls.push({
                        url: img.src,
                        type: 'image',
                        source: 'main_image',
                        alt: img.alt || ''
                    })
                }
            }
        })

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
            mediaDetails: mediaUrls,
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
            mediaCount: mediaUrls.length,
            mediaTypes: mediaUrls.map(m => `${m.type}(${m.source})`).join(', '),
            mainMediaUrl: mediaUrls[0]?.url || 'none',
            totalImagesFound: images.length,
            hasSponsored,
            hasSeeAdDetails
        })

        // Debug: Log all image URLs found for troubleshooting
        if (images.length > 0 && mediaUrls.length === 0) {
            console.log('🔍 No media detected but images found. Debugging:',
                Array.from(images).map(img => ({
                    src: img.src?.substring(0, 100) + '...',
                    dimensions: `${img.offsetWidth}x${img.offsetHeight}`,
                    classes: img.className
                }))
            )
        }

        return result
    }

    injectSaveButton(adCard) {
        const container = adCard.container
        const libraryId = adCard.libraryId

        // Check if save button already exists
        if (container.querySelector('.adboard-save-btn')) {
            return
        }

        // Find the "See ad details" or "See summary details" button
        let targetButton = null
        const buttons = container.querySelectorAll('[role="button"]')
        for (const btn of buttons) {
            const text = btn.textContent || ''
            if (text.includes('See ad details') || text.includes('See summary details')) {
                targetButton = btn
                break
            }
        }

        if (!targetButton) {
            console.log('⚠️ Could not find "See ad details" button for ad:', libraryId)
            return
        }

        // Create save button container
        const saveButtonContainer = document.createElement('div')
        saveButtonContainer.style.cssText = `
            margin-top: 8px;
            display: flex;
            gap: 8px;
            align-items: center;
        `

        // Create single AdBoard save button
        const saveButton = document.createElement('button')
        saveButton.className = 'adboard-save-btn'
        saveButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
            </svg>
            Add to AdBoard
        `
        saveButton.style.cssText = `
            background: #1877f2;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: background-color 0.2s;
        `

        // Add hover effects
        saveButton.addEventListener('mouseenter', () => {
            saveButton.style.backgroundColor = '#166fe5'
        })
        saveButton.addEventListener('mouseleave', () => {
            saveButton.style.backgroundColor = '#1877f2'
        })

        // Add click handler - opens multi-board dialog by default
        saveButton.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            this.showMultiBoardDialog(adCard)
        })

        // Add button to container
        saveButtonContainer.appendChild(saveButton)

        // Insert after the target button's parent container
        const insertionPoint = targetButton.closest('div[role="none"]') || targetButton.parentElement
        insertionPoint.parentElement.insertBefore(saveButtonContainer, insertionPoint.nextSibling)

        console.log(`💾 Injected save buttons for ad: ${libraryId}`)
    }



    async showMultiBoardDialog(adCard) {
        // Create modal overlay
        const overlay = document.createElement('div')
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `

        // Create dialog
        const dialog = document.createElement('div')
        dialog.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 24px;
            min-width: 450px;
            max-width: 600px;
            max-height: 70vh;
            overflow-y: auto;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `

        // Load boards
        const boards = await this.loadBoards()

        dialog.innerHTML = `
            <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Save to Multiple Boards</h3>
            <div style="margin-bottom: 16px;">
                <strong>${adCard.brandName}</strong>
                <div style="font-size: 14px; color: #666; margin-top: 4px;">
                    ${adCard.adText.substring(0, 100)}${adCard.adText.length > 100 ? '...' : ''}
                </div>
                    </div>
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 12px; font-weight: 600;">Select Boards:</label>
                <div id="boardCheckboxes" style="max-height: 200px; overflow-y: auto; border: 1px solid #eee; padding: 12px; border-radius: 4px;">
                    ${boards.map(board => `
                        <label style="display: block; margin-bottom: 8px; cursor: pointer;">
                            <input type="checkbox" value="${board.id}" style="margin-right: 8px;">
                            ${board.name}
                        </label>
                    `).join('')}
                </div>
            </div>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button id="cancelBtn" style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button id="saveBtn" style="padding: 8px 16px; background: #42b883; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">Save to Selected Boards</button>
            </div>
        `

        overlay.appendChild(dialog)
        document.body.appendChild(overlay)

        // Handle buttons
        dialog.querySelector('#cancelBtn').addEventListener('click', () => {
            overlay.remove()
        })

        dialog.querySelector('#saveBtn').addEventListener('click', async () => {
            const selectedCheckboxes = dialog.querySelectorAll('#boardCheckboxes input[type="checkbox"]:checked')
            const selectedBoardIds = Array.from(selectedCheckboxes).map(cb => cb.value)

            if (selectedBoardIds.length === 0) {
                alert('Please select at least one board')
                return
            }

            // Save to all boards in one API call
            await this.saveAdToMultipleBoards(adCard, selectedBoardIds)
            overlay.remove()
        })

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove()
        })
    }

    async loadBoards() {
        try {
            console.log('🔄 Loading boards from background script...')
            const response = await chrome.runtime.sendMessage({
                type: 'LOAD_BOARDS'
            })
            console.log('📋 Background script response:', response)

            // Check response structure carefully
            console.log('🔍 Raw response structure:', {
                hasResponse: !!response,
                responseKeys: response ? Object.keys(response) : 'none',
                hasSuccess: response?.success,
                hasData: !!response?.data,
                dataKeys: response?.data ? Object.keys(response.data) : 'none',
                hasBoards: !!response?.data?.boards,
                boardsLength: response?.data?.boards?.length,
                firstBoard: response?.data?.boards?.[0]
            })

            if (response?.success && response?.data?.boards) {
                console.log(`✅ Loaded ${response.data.boards.length} real boards:`, response.data.boards)
                return response.data.boards
            } else if (response?.data?.boards) {
                console.log(`✅ Loaded ${response.data.boards.length} boards (no success flag):`, response.data.boards)
                return response.data.boards
            } else {
                console.error('❌ Invalid response format. Expected boards array but got:', response)
                throw new Error('Invalid response format from background script')
            }
        } catch (error) {
            console.error('❌ Error loading boards:', error)
            // Don't return dummy boards - let the user see the real error
            throw error
        }
    }

    async saveAdToBoard(adCard, boardId) {
        try {
            const requestData = {
                boardIds: [boardId], // Send as array
                adData: {
                    fbAdId: adCard.libraryId,
                    brandName: adCard.brandName,
                    headline: adCard.adText.substring(0, 100),
                    adText: adCard.adText,
                    description: '',
                    cta: '',
                    mediaDetails: adCard.mediaDetails,
                    firstSeenDate: new Date().toISOString(),
                    lastSeenDate: new Date().toISOString()
                }
            }

            console.log('💾 Saving ad to board:', boardId, 'with data:', requestData)

            const response = await chrome.runtime.sendMessage({
                type: 'SAVE_AD',
                data: requestData
            })

            if (response.success) {
                this.showSuccessMessage('Ad saved successfully!')
            } else {
                console.error('Error saving ad:', response.error)
                alert('Error saving ad: ' + response.error)
            }
        } catch (error) {
            console.error('Error saving ad:', error)
            alert('Error saving ad: ' + error.message)
        }
    }

    async saveAdToMultipleBoards(adCard, boardIds) {
        try {
            const requestData = {
                boardIds: boardIds, // Send all selected board IDs
                adData: {
                    fbAdId: adCard.libraryId,
                    brandName: adCard.brandName,
                    headline: adCard.adText.substring(0, 100),
                    adText: adCard.adText,
                    description: '',
                    cta: '',
                    mediaDetails: adCard.mediaDetails,
                    firstSeenDate: new Date().toISOString(),
                    lastSeenDate: new Date().toISOString()
                }
            }

            console.log('💾 Saving ad to multiple boards:', boardIds, 'with data:', requestData)

            const response = await chrome.runtime.sendMessage({
                type: 'SAVE_AD',
                data: requestData
            })

            if (response.success) {
                this.showSuccessMessage(`Ad saved to ${boardIds.length} board(s) successfully!`)
            } else {
                console.error('Error saving ad:', response.error)
                alert('Error saving ad: ' + response.error)
            }
        } catch (error) {
            console.error('Error saving ad:', error)
            alert('Error saving ad: ' + error.message)
        }
    }

    showSuccessMessage(message) {
        const notification = document.createElement('div')
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10001;
            font-weight: 600;
            animation: slideIn 0.3s ease-out;
        `
        notification.textContent = message

        // Add animation
        const style = document.createElement('style')
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `
        document.head.appendChild(style)

        document.body.appendChild(notification)

        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove()
            style.remove()
        }, 3000)
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
