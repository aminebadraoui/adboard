// AdBoard Chrome Extension - Content Script
// Clean restart - focused on detecting individual ad cards with instant UI

class AdBoardSaver {
    constructor() {
        this.adboardUrl = 'http://localhost:3000' // Change for production
        this.injectedAds = new Set() // Track processed ads
        this.boardsCache = null // Cache for boards
        this.sessionValid = false // Session status
        this.isInitialized = false // Track initialization
        this.init()
    }

    async init() {
        // Only run on Facebook Ad Library pages
        if (!this.isAdLibraryPage()) {
            console.log('🚫 AdBoard: Not a Facebook Ad Library page, exiting')
            return
        }

        console.log('🎯 AdBoard: Facebook Ad Library page detected')
        console.log('🔍 Current URL:', window.location.href)

        // Check extension health first
        const extensionHealthy = await this.checkExtensionHealth()
        if (!extensionHealthy) {
            console.warn('⚠️ AdBoard: Extension health check failed, showing error state')
            this.handleExtensionFailure()
            return
        }

        // Pre-check session and load boards in background
        await this.preloadData()

        // Show status to user
        this.showExtensionStatus()

        // Wait for page to load, then start detection
        setTimeout(() => {
            console.log('🔄 AdBoard: Starting clean ad detection...')
            this.detectAndLogAdCards()
        }, 3000)

        // Observe for new content
        this.observeNewAds()

        // Set up periodic health checks
        this.setupHealthMonitoring()
    }

    setupHealthMonitoring() {
        // Check extension health every 30 seconds
        setInterval(async () => {
            try {
                const isHealthy = await this.checkExtensionHealth()
                if (!isHealthy && !this.extensionFailed) {
                    console.warn('⚠️ AdBoard: Extension health degraded, showing error state')
                    this.handleExtensionFailure()
                } else if (isHealthy && this.extensionFailed) {
                    console.log('✅ AdBoard: Extension health recovered')
                    this.extensionFailed = false
                    // Try to reinitialize
                    await this.preloadData()
                    this.showExtensionStatus()
                }
            } catch (error) {
                console.error('❌ AdBoard: Health monitoring error:', error)
            }
        }, 30000) // 30 seconds
    }

    async preloadData() {
        try {
            console.log('🔄 AdBoard: Pre-loading session and boards data...')

            // Check session validity
            const sessionResponse = await this.sendMessageWithRetry({
                type: 'CHECK_SESSION'
            })

            if (sessionResponse?.success) {
                this.sessionValid = sessionResponse.data.isValid
                console.log('✅ AdBoard: Session check completed, valid:', this.sessionValid)

                // If session is valid, pre-load boards
                if (this.sessionValid) {
                    await this.loadBoards()
                }
            } else {
                console.log('⚠️ AdBoard: Session check failed, assuming invalid')
                this.sessionValid = false
            }

            this.isInitialized = true
            console.log('✅ AdBoard: Pre-loading completed')
        } catch (error) {
            console.error('❌ AdBoard: Pre-loading failed:', error)

            // Check if it's a storage/IO error
            if (error.message && error.message.includes('IO error')) {
                this.handleExtensionFailure()
            } else {
                this.sessionValid = false
                this.isInitialized = true
            }
        }
    }

    async loadBoards() {
        try {
            console.log('🔄 AdBoard: Loading boards...')
            const response = await this.sendMessageWithRetry({
                type: 'LOAD_BOARDS'
            })

            if (response?.success && response?.data?.boards) {
                this.boardsCache = response.data.boards
                console.log(`✅ AdBoard: Loaded ${this.boardsCache.length} boards`)
            } else {
                console.error('❌ AdBoard: Failed to load boards:', response)
                this.boardsCache = []
            }
        } catch (error) {
            console.error('❌ AdBoard: Error loading boards:', error)
            this.boardsCache = []
        }
    }

    // Helper method to send messages with retry and error handling
    async sendMessageWithRetry(message, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 AdBoard: Sending message (attempt ${attempt}/${maxRetries}):`, message.type)

                const response = await chrome.runtime.sendMessage(message)
                console.log(`✅ AdBoard: Message sent successfully on attempt ${attempt}`)
                return response

            } catch (error) {
                console.error(`❌ AdBoard: Message send failed on attempt ${attempt}:`, error)

                // Check if it's a storage/IO error
                if (error.message && error.message.includes('IO error')) {
                    console.warn('⚠️ AdBoard: IO error detected, this might be a Chrome extension storage issue')

                    // For IO errors, try a different approach - use a timeout-based retry
                    if (attempt === 1) {
                        console.log('🔄 AdBoard: Trying alternative message approach...')
                        try {
                            // Try using a promise with timeout as alternative
                            const response = await Promise.race([
                                chrome.runtime.sendMessage(message),
                                new Promise((_, reject) =>
                                    setTimeout(() => reject(new Error('Timeout')), 5000)
                                )
                            ])
                            console.log('✅ AdBoard: Alternative approach succeeded')
                            return response
                        } catch (altError) {
                            console.log('⚠️ AdBoard: Alternative approach also failed:', altError.message)
                        }
                    }

                    // Wait a bit before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt))

                    if (attempt === maxRetries) {
                        console.error('❌ AdBoard: All retry attempts failed due to IO errors')
                        // Don't throw, instead return a fallback response
                        return this.getFallbackResponse(message.type)
                    }
                    continue
                }

                // For other errors, don't retry
                throw error
            }
        }
    }

    // Provide fallback responses when extension communication fails
    getFallbackResponse(messageType) {
        console.log('🔄 AdBoard: Providing fallback response for:', messageType)

        switch (messageType) {
            case 'CHECK_SESSION':
                return { success: false, data: { isValid: false }, error: 'Extension communication failed' }
            case 'LOAD_BOARDS':
                return { success: false, data: { boards: [] }, error: 'Extension communication failed' }
            default:
                return { success: false, error: 'Extension communication failed' }
        }
    }

    // Fallback method when extension communication fails
    handleExtensionFailure() {
        console.warn('⚠️ AdBoard: Extension communication failed, showing fallback UI')

        // Set a flag to show fallback state
        this.extensionFailed = true
        this.sessionValid = false
        this.isInitialized = true

        // Show a message to the user
        this.showExtensionError()
    }

    showExtensionError() {
        // Create a notification about the extension issue
        const notification = document.createElement('div')
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff9800;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10001;
            font-weight: 600;
            max-width: 300px;
            font-size: 14px;
        `
        notification.innerHTML = `
            <div style="margin-bottom: 8px;">⚠️ AdBoard Extension Issue</div>
            <div style="font-size: 12px; opacity: 0.9;">
                The extension is having trouble communicating. 
                Try reloading the extension or refreshing the page.
            </div>
        `

        document.body.appendChild(notification)

        // Remove after 10 seconds
        setTimeout(() => {
            notification.remove()
        }, 10000)
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
            'div[style*="white-space: pre-wrap"]', // Direct div with pre-wrap (most reliable)
            'div[style*="white-space: pre-wrap"] span', // Main ad copy
            'div[tabindex="0"][role="button"] div span', // Alternative ad copy structure
            'span[style*="white-space"]', // Any span with white-space styling
            'div._4ik4 div[style*="white-space: pre-wrap"]', // Facebook's text container with pre-wrap
            'div._4ik4 span', // Facebook's text container class
            'div[tabindex="0"][role="button"] div[style*="white-space: pre-wrap"]' // Button with pre-wrap
        ]

        for (const selector of adTextSelectors) {
            const elements = container.querySelectorAll(selector)
            for (const element of elements) {
                // Use innerHTML to preserve line breaks and formatting
                let elementText = ''

                // Try to get text with line breaks preserved
                if (element.innerHTML) {
                    // Convert <br> tags to actual line breaks
                    elementText = element.innerHTML
                        .replace(/<br\s*\/?>/gi, '\n') // Convert <br> to \n
                        .replace(/<br\s*\/?>/gi, '\n') // Handle self-closing <br/>
                        .replace(/<[^>]*>/g, '') // Remove all other HTML tags
                        .trim()
                } else if (element.textContent) {
                    // Fallback to textContent if no innerHTML
                    elementText = element.textContent.trim()
                } else {
                    elementText = ''
                }

                // Clean up multiple consecutive line breaks
                if (elementText) {
                    elementText = elementText
                        .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace 3+ line breaks with 2
                        .replace(/\n\s*\n/g, '\n\n') // Replace 2 line breaks with 2 (clean)
                        .trim()
                }

                // Look for substantial text that doesn't contain metadata
                if (elementText && elementText.length > 20 && elementText.length < 1000 &&
                    !elementText.includes('Library ID') && !elementText.includes('Sponsored') &&
                    !elementText.includes('Started running') && !elementText.includes('See ad details') &&
                    !elementText.includes('This ad has') && !elementText.match(/^\d+\s+ads/)) {

                    // Debug: Log the text extraction process
                    console.log('🔍 Found potential ad text:', {
                        selector: selector,
                        originalLength: element.innerHTML?.length || 0,
                        processedLength: elementText.length,
                        hasLineBreaks: elementText.includes('\n'),
                        lineBreakCount: (elementText.match(/\n/g) || []).length,
                        sampleText: elementText.substring(0, 100) + '...'
                    })

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
            adTextWithBreaks: adText.replace(/\n/g, '\\n'), // Show line breaks in console
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
            justify-content: center;
        `

        // Create single AdBoard save button with instant rendering
        const saveButton = this.createSaveButton(adCard)

        // Add button to container
        saveButtonContainer.appendChild(saveButton)

        // Insert after the target button's parent container
        const insertionPoint = targetButton.closest('div[role="none"]') || targetButton.parentElement

        // Make sure we have a valid insertion point
        if (insertionPoint && insertionPoint.parentElement) {
            insertionPoint.parentElement.insertBefore(saveButtonContainer, insertionPoint.nextSibling)
        } else {
            // Fallback: insert at the end of the container
            container.appendChild(saveButtonContainer)
        }

        console.log(`💾 Injected save buttons for ad: ${libraryId}`)
    }

    createSaveButton(adCard) {
        const saveButton = document.createElement('button')
        saveButton.className = 'adboard-save-btn'

        // Set initial state based on session and boards availability
        if (!this.isInitialized) {
            // Show loading state while initializing
            saveButton.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                Loading...
            `
            saveButton.disabled = true
        } else if (!this.sessionValid) {
            // Show login required state
            saveButton.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z"/>
                </svg>
                Login Required
            `
            saveButton.disabled = true
        } else {
            // Show normal save button
            saveButton.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                </svg>
                Add to AdBoard
            `
        }

        saveButton.style.cssText = `
            background: ${this.sessionValid ? '#1877f2' : '#ccc'};
            color: white;
            border: none;
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 14px;
            font-weight: 600;
            cursor: ${this.sessionValid ? 'pointer' : 'not-allowed'};
            display: flex;
            align-items: center;
            gap: 6px;
            transition: background-color 0.2s;
        `

        // Add hover effects only if button is enabled
        if (this.sessionValid) {
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
        }

        return saveButton
    }

    async showMultiBoardDialog(adCard) {
        // Check if we have boards cached
        if (!this.boardsCache || this.boardsCache.length === 0) {
            // Try to load boards if not cached
            await this.loadBoards()
        }

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

        // Show boards immediately if cached, or show loading state
        if (this.boardsCache && this.boardsCache.length > 0) {
            this.renderBoardsDialog(dialog, adCard, this.boardsCache)
        } else {
            this.renderLoadingDialog(dialog, adCard)
            // Load boards in background
            this.loadBoards().then(boards => {
                if (boards && boards.length > 0) {
                    this.renderBoardsDialog(dialog, adCard, boards)
                } else {
                    this.renderErrorDialog(dialog, 'No boards found. Please create a board first.')
                }
            }).catch(error => {
                this.renderErrorDialog(dialog, `Failed to load boards: ${error.message}`)
            })
        }

        overlay.appendChild(dialog)
        document.body.appendChild(overlay)

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove()
        })
    }

    renderBoardsDialog(dialog, adCard, boards) {
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

        // Handle buttons
        dialog.querySelector('#cancelBtn').addEventListener('click', () => {
            dialog.closest('div[style*="position: fixed"]').remove()
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
            dialog.closest('div[style*="position: fixed"]').remove()
        })
    }

    renderLoadingDialog(dialog, adCard) {
        dialog.innerHTML = `
            <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Save to Multiple Boards</h3>
            <div style="margin-bottom: 16px;">
                <strong>${adCard.brandName}</strong>
                <div style="font-size: 14px; color: #666; margin-top: 4px;">
                    ${adCard.adText.substring(0, 100)}${adCard.adText.length > 100 ? '...' : ''}
                </div>
            </div>
            <div style="margin-bottom: 16px; text-align: center; padding: 40px;">
                <div style="margin-bottom: 16px;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="#1877f2" style="animation: spin 1s linear infinite;">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                </div>
                <div style="color: #666;">Loading boards...</div>
            </div>
            <style>
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            </style>
        `
    }

    renderErrorDialog(dialog, errorMessage) {
        dialog.innerHTML = `
            <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Save to Multiple Boards</h3>
            <div style="margin-bottom: 16px; text-align: center; padding: 40px;">
                <div style="margin-bottom: 16px; color: #e74c3c;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v2h-2zm0-8h2v6h-2z"/>
                    </svg>
                </div>
                <div style="color: #e74c3c; margin-bottom: 16px;">${errorMessage}</div>
                <button id="retryBtn" style="padding: 8px 16px; background: #1877f2; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button>
            </div>
        `

        dialog.querySelector('#retryBtn').addEventListener('click', async () => {
            this.renderLoadingDialog(dialog, adCard)
            try {
                await this.loadBoards()
                if (this.boardsCache && this.boardsCache.length > 0) {
                    this.renderBoardsDialog(dialog, adCard, this.boardsCache)
                } else {
                    this.renderErrorDialog(dialog, 'No boards found. Please create a board first.')
                }
            } catch (error) {
                this.renderErrorDialog(dialog, `Failed to load boards: ${error.message}`)
            }
        })
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

    // Check if extension is working properly
    async checkExtensionHealth() {
        try {
            console.log('🔍 AdBoard: Checking extension health...')

            // Try a simple ping first
            const pingResponse = await this.sendMessageWithRetry({ type: 'PING' })
            if (pingResponse?.success) {
                console.log('✅ AdBoard: Extension health check passed')
                return true
            } else {
                console.warn('⚠️ AdBoard: Extension health check failed')
                return false
            }
        } catch (error) {
            console.error('❌ AdBoard: Extension health check error:', error)
            return false
        }
    }

    // Show extension status to user
    showExtensionStatus() {
        if (this.extensionFailed) {
            this.showExtensionError()
        } else if (!this.sessionValid) {
            this.showSessionStatus()
        } else {
            this.showReadyStatus()
        }
    }

    showSessionStatus() {
        const notification = document.createElement('div')
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10001;
            font-weight: 600;
            max-width: 300px;
            font-size: 14px;
        `
        notification.innerHTML = `
            <div style="margin-bottom: 8px;">🔐 AdBoard Login Required</div>
            <div style="font-size: 12px; opacity: 0.9;">
                Please log in to AdBoard to save ads. 
                <a href="http://localhost:3000/dashboard" target="_blank" style="color: white; text-decoration: underline;">Go to Dashboard</a>
            </div>
        `

        document.body.appendChild(notification)

        // Remove after 15 seconds
        setTimeout(() => {
            notification.remove()
        }, 15000)
    }

    showReadyStatus() {
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
            max-width: 300px;
            font-size: 14px;
        `
        notification.innerHTML = `
            <div style="margin-bottom: 8px;">✅ AdBoard Ready</div>
            <div style="font-size: 12px; opacity: 0.9;">
                You can now save ads to your boards!
            </div>
        `

        document.body.appendChild(notification)

        // Remove after 5 seconds
        setTimeout(() => {
            notification.remove()
        }, 5000)
    }
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new AdBoardSaver()
    })
} else {
    new AdBoardSaver()
}
