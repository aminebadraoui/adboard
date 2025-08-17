// AdBoard Chrome Extension - Content Script
// Clean restart - focused on detecting individual ad cards with instant UI

class AdBoardSaver {
    constructor() {
        console.log('🏗️ AdBoard: Constructor called - instance ID:', Date.now())
        this.adboardUrl = 'http://localhost:3000' // Change for production
        this.injectedAds = new Set() // Track processed ads
        this.isObserving = false // Prevent multiple simultaneous observations
        this.boardsCache = null // Cache for boards
        this.sessionValid = false // Session status
        this.isInitialized = false // Track initialization
        this.extensionFailed = false // Track extension failure state
        this.recoveryInProgress = false // Track recovery attempts
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

        // Start with basic extension availability check
        try {
            // Check if chrome.runtime is available
            if (!chrome.runtime || !chrome.runtime.id) {
                console.warn('⚠️ AdBoard: Chrome runtime not available, will retry...')
                this.showLoadingState()
            } else {
                // Try a simple ping to see if extension is responsive
                const pingSuccess = await this.trySimplePing()
                if (!pingSuccess) {
                    console.warn('⚠️ AdBoard: Extension not responsive, will retry later')
                    this.showLoadingState()
                }
            }
        } catch (error) {
            console.log('⏳ AdBoard: Extension check failed, will retry later:', error.message)
            this.showLoadingState()
        }

        // Continue with initialization regardless of extension status
        // The health monitoring will handle recovery
        this.continueInitialization()
    }

    setupHealthMonitoring() {
        // Check extension health every 30 seconds
        setInterval(async () => {
            try {
                // Skip health checks if we're already in recovery mode
                if (this.extensionFailed && this.recoveryInProgress) {
                    return
                }

                const isHealthy = await this.checkExtensionHealth()
                if (!isHealthy && !this.extensionFailed) {
                    console.warn('⚠️ AdBoard: Extension health degraded, showing error state')
                    this.handleExtensionFailure()
                } else if (isHealthy && this.extensionFailed) {
                    console.log('✅ AdBoard: Extension health recovered')
                    this.extensionFailed = false
                    this.recoveryInProgress = false
                    // Try to reinitialize
                    await this.preloadData()
                    this.showExtensionStatus()
                }
            } catch (error) {
                console.error('❌ AdBoard: Health monitoring error:', error)

                // If it's an extension context error, handle it
                if (error.message && (
                    error.message.includes('Extension context invalidated') ||
                    error.message.includes('Could not establish connection')
                )) {
                    this.handleExtensionContextInvalid()
                }

                // If it's a fetch error, don't treat it as fatal during health monitoring
                if (error.message && (
                    error.message.includes('Failed to fetch') ||
                    error.message.includes('NetworkError')
                )) {
                    console.log('⏳ AdBoard: Fetch error during health check - will retry later')
                    return
                }
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

            // Update any existing buttons that are stuck in loading state
            this.updateAllSaveButtons()
        } catch (error) {
            console.error('❌ AdBoard: Pre-loading failed:', error)

            // Check for extension context issues first
            if (error.message && (
                error.message.includes('Extension context invalidated') ||
                error.message.includes('Could not establish connection') ||
                error.message.includes('Chrome runtime not available')
            )) {
                this.handleExtensionContextInvalid()
            } else if (error.message && error.message.includes('IO error')) {
                this.handleExtensionFailure()
            } else {
                this.sessionValid = false
                this.isInitialized = true
                this.updateAllSaveButtons()
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

            // Check for extension context issues
            if (error.message && (
                error.message.includes('Extension context invalidated') ||
                error.message.includes('Could not establish connection') ||
                error.message.includes('Chrome runtime not available')
            )) {
                // Don't set boardsCache here, let the extension context handler deal with it
                throw error
            } else {
                this.boardsCache = []
            }
        }
    }

    // Helper method to send messages with retry and error handling
    async sendMessageWithRetry(message, maxRetries = 3) {
        // Check if chrome.runtime is available before attempting
        if (!chrome.runtime || !chrome.runtime.id) {
            console.warn('⚠️ AdBoard: Chrome runtime not available, cannot send message')
            throw new Error('Chrome runtime not available')
        }

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 AdBoard: Sending message (attempt ${attempt}/${maxRetries}):`, message.type)

                // Use a timeout-based approach to prevent hanging
                const response = await Promise.race([
                    chrome.runtime.sendMessage(message),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Message timeout')), 5000)
                    )
                ])

                console.log(`✅ AdBoard: Message sent successfully on attempt ${attempt}`)
                return response

            } catch (error) {
                console.error(`❌ AdBoard: Message send failed on attempt ${attempt}:`, error)

                // Check for extension context invalidation first
                if (error.message && (
                    error.message.includes('Extension context invalidated') ||
                    error.message.includes('Could not establish connection') ||
                    error.message.includes('chrome.runtime is not defined')
                )) {
                    console.warn('⚠️ AdBoard: Extension context invalidated detected')
                    this.handleExtensionContextInvalid()
                    throw error // Don't retry, let caller handle it
                }

                // Check for timeout errors (common during extension reload)
                if (error.message && (
                    error.message.includes('Message timeout') ||
                    error.message.includes('Failed to fetch') ||
                    error.message.includes('NetworkError')
                )) {
                    console.warn('⚠️ AdBoard: Message timeout/fetch error detected (attempt ${attempt})')

                    if (attempt === maxRetries) {
                        console.error('❌ AdBoard: All retry attempts failed due to timeout/fetch errors')
                        throw new Error('Extension communication timeout - extension may be reloading')
                    }

                    // Wait longer between retries for timeout errors
                    await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
                    continue
                }

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

        // Update existing buttons to show the error state
        this.updateAllSaveButtons()

        // Show a message to the user
        this.showExtensionError()
    }

    // Handle extension context invalidation (extension reloaded/updated)
    handleExtensionContextInvalid() {
        console.warn('⚠️ AdBoard: Extension context invalidated - extension may have been reloaded')

        // Set flags to show extension needs reload
        this.extensionFailed = true
        this.sessionValid = false
        this.isInitialized = true

        // Update existing buttons to show the reload state
        this.updateAllSaveButtons()

        // Show specific message about extension reload
        this.showExtensionReloadMessage()

        // Try to recover by checking if extension comes back
        this.attemptExtensionRecovery()
    }

    // Attempt to recover from extension context invalidation
    attemptExtensionRecovery() {
        console.log('🔄 AdBoard: Attempting extension recovery...')
        this.recoveryInProgress = true

        // Check every 5 seconds if extension is back
        const recoveryInterval = setInterval(async () => {
            try {
                // Check if chrome.runtime is available again
                if (!chrome.runtime || !chrome.runtime.id) {
                    console.log('⏳ AdBoard: Chrome runtime still not available...')
                    return
                }

                // Try to ping the extension
                const response = await this.sendMessageWithRetry({ type: 'PING' }, 1)
                if (response?.success) {
                    console.log('✅ AdBoard: Extension recovered! Reinitializing...')
                    clearInterval(recoveryInterval)

                    // Reset flags and reinitialize
                    this.extensionFailed = false
                    this.recoveryInProgress = false
                    this.sessionValid = false
                    this.isInitialized = false

                    // Try to reinitialize
                    this.init()
                }
            } catch (error) {
                console.log('⏳ AdBoard: Extension still not responding...')
            }
        }, 5000) // Check every 5 seconds

        // Stop checking after 2 minutes (24 attempts)
        setTimeout(() => {
            clearInterval(recoveryInterval)
            this.recoveryInProgress = false
            console.log('⏰ AdBoard: Extension recovery timeout reached')
        }, 120000)
    }

    // Try a simple ping without complex error handling
    async trySimplePing() {
        try {
            if (!chrome.runtime || !chrome.runtime.id) {
                return false
            }

            // Use a simple timeout-based approach
            const response = await Promise.race([
                chrome.runtime.sendMessage({ type: 'PING' }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Ping timeout')), 2000))
            ])

            return response && response.success
        } catch (error) {
            console.log('⏳ AdBoard: Simple ping failed:', error.message)
            return false
        }
    }

    // Show loading state while extension initializes
    showLoadingState() {
        const notification = document.createElement('div')
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #1877f2;
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
            <div style="margin-bottom: 8px;">🔄 AdBoard Initializing</div>
            <div style="font-size: 12px; opacity: 0.9;">
                The extension is starting up. This may take a few seconds.
            </div>
        `

        document.body.appendChild(notification)

        // Remove after 15 seconds
        setTimeout(() => {
            notification.remove()
        }, 15000)
    }

    // Continue with initialization after basic checks
    async continueInitialization() {
        // Set up periodic health checks first
        this.setupHealthMonitoring()

        // Listen for page visibility changes to help with recovery
        this.setupPageVisibilityListener()

        // Start ad detection immediately (don't wait for extension)
        setTimeout(() => {
            console.log('🔄 AdBoard: Starting clean ad detection...')
            this.detectAndLogAdCards()
        }, 3000)

        // Observe for new content
        this.observeNewAds()

        // Try to initialize extension data in background
        this.attemptExtensionInitialization()
    }

    // Attempt to initialize extension data in background
    async attemptExtensionInitialization() {
        // Wait a bit before trying
        await new Promise(resolve => setTimeout(resolve, 2000))

        try {
            // Try to preload data
            await this.preloadData()

            // Show status to user
            this.showExtensionStatus()

            console.log('✅ AdBoard: Extension initialization completed')
        } catch (error) {
            console.log('⏳ AdBoard: Extension initialization failed, will retry later:', error.message)

            // Don't show error state yet, just let health monitoring handle it
            // The extension might still be starting up
        }
    }

    // Listen for page visibility changes to help with recovery
    setupPageVisibilityListener() {
        document.addEventListener('visibilitychange', async () => {
            if (!document.hidden && this.extensionFailed) {
                console.log('🔄 AdBoard: Page became visible, checking extension health...')

                // Wait a moment for the page to fully load
                setTimeout(async () => {
                    try {
                        const isHealthy = await this.checkExtensionHealth()
                        if (isHealthy) {
                            console.log('✅ AdBoard: Extension recovered after page visibility change')
                            this.extensionFailed = false
                            this.recoveryInProgress = false
                            await this.preloadData()
                            this.showExtensionStatus()
                        }
                    } catch (error) {
                        console.log('⏳ AdBoard: Extension still not responding after page visibility change')
                    }
                }, 1000)
            }
        })
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

    showExtensionReloadMessage() {
        // Create a notification about extension reload
        const notification = document.createElement('div')
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #e74c3c;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10001;
            font-weight: 600;
            max-width: 350px;
            font-size: 14px;
        `
        notification.innerHTML = `
            <div style="margin-bottom: 8px;">🔄 AdBoard Extension Reloaded</div>
            <div style="font-size: 12px; opacity: 0.9; margin-bottom: 12px;">
                The extension has been reloaded or updated. 
                Please refresh this page to reconnect.
            </div>
            <button id="refreshPageBtn" style="
                background: white; 
                color: #e74c3c; 
                border: none; 
                padding: 6px 12px; 
                border-radius: 4px; 
                cursor: pointer; 
                font-size: 12px; 
                font-weight: 600;
            ">Refresh Page</button>
        `

        // Add refresh button functionality
        const refreshBtn = notification.querySelector('#refreshPageBtn')
        refreshBtn.addEventListener('click', () => {
            window.location.reload()
        })

        document.body.appendChild(notification)

        // Remove after 30 seconds (longer for reload message)
        setTimeout(() => {
            notification.remove()
        }, 30000)
    }

    isAdLibraryPage() {
        return window.location.hostname === 'www.facebook.com' &&
            window.location.pathname.startsWith('/ads/library')
    }

    detectAndLogAdCards() {
        const callId = Date.now()
        console.log('🔍 AdBoard: Starting ad card detection... (Call ID:', callId, ')')

        // Prevent duplicate processing
        if (this.processingAds) {
            console.log('⚠️ AdBoard: Already processing ads, skipping... (Call ID:', callId, ')')
            return
        }
        this.processingAds = true

        // Strategy: Look for the ACTUAL ad card containers, not parent containers
        const potentialAdCards = []

        // Look for Facebook's specific ad card containers
        const adCardSelectors = [
            // Primary: Look for containers with Library ID that are actual ad cards
            'div[data-testid="ad-card"]',
            'div[role="article"]',
            'div[data-testid="ad"]',
            // Fallback: Look for containers with specific Facebook classes
            'div.x1lliihq.x1n2onr6.x5n08af.x2lah0s.x6ikm8r.x10wlt62.xlyipyv.x1h4wuuj',
            'div.x1lliihq.x1n2onr6.x5n08af.x2lah0s.x6ikm8r.x10wlt62.xlyipyv.x1h4wuuj.x1h4wuuj'
        ]

        let foundAdCards = []

        // Try each selector to find ad cards
        for (const selector of adCardSelectors) {
            const elements = document.querySelectorAll(selector)
            if (elements.length > 0) {
                console.log(`✅ Found ${elements.length} ad cards using selector: ${selector}`)
                foundAdCards = Array.from(elements)
                break
            }
        }

        // If no ad cards found with selectors, fall back to the old method but be more precise
        if (foundAdCards.length === 0) {
            console.log('⚠️ No ad cards found with selectors, falling back to text-based detection...')

            // Look for containers that have BOTH Library ID and are reasonable sized
            const allDivs = document.querySelectorAll('div')
            console.log(`📊 Total divs on page: ${allDivs.length}`)

            allDivs.forEach((div, index) => {
                const text = div.textContent || ''

                // Look for Library ID pattern (primary indicator)
                const libraryIdMatch = text.match(/Library ID:\s*(\d+)/i)

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

                    // Try to find a more specific ad container by looking for a parent with better characteristics
                    let adContainer = div
                    let parent = div.parentElement
                    while (parent && parent !== document.body) {
                        const parentRect = parent.getBoundingClientRect()
                        const parentLinkCount = parent.querySelectorAll('a[href*="http"]').length

                        // If parent has reasonable size and link count, and contains the Library ID, use it
                        if (parentRect.width > 400 && parentRect.width < 1500 &&
                            parentRect.height > 300 && parentRect.height < 1500 &&
                            parentLinkCount < 15 &&
                            parent.textContent.includes(libraryId)) {
                            adContainer = parent
                        }
                        parent = parent.parentElement
                    }

                    // Update the div reference to the better container
                    div = adContainer
                    isValidAd = true
                } else if (hasSponsored && hasImages && (hasSeeAdDetails || hasActive)) {
                    // Secondary: Sponsored image ads
                    libraryId = `sponsored_${this.hashCode(text.substring(0, 200))}_${Date.now()}`
                    isValidAd = true
                }

                if (isValidAd && libraryId) {
                    // Make sure this div is a reasonable size (not too small or too large)
                    const rect = div.getBoundingClientRect()
                    const hasGoodSize = rect.width > 300 && rect.height > 200 &&
                        rect.width < 2000 && rect.height < 2000 // Prevent overly large containers

                    // Also check that this container doesn't have too many links (sign of page-wide container)
                    const linkCount = div.querySelectorAll('a[href*="http"]').length
                    const reasonableLinkCount = linkCount < 20 // Individual ads shouldn't have 20+ links

                    // Make sure it's not a duplicate (same ID already processed)
                    const isUnique = !potentialAdCards.some(card => card.libraryId === libraryId)

                    // Additional check for content similarity to avoid processing the same ad multiple times
                    let isContentUnique = true
                    if (libraryId.startsWith('sponsored_')) {
                        const adText = div.textContent || ''
                        isContentUnique = !potentialAdCards.some(card => {
                            const existingText = card.container?.textContent || ''
                            const similarity = this.calculateTextSimilarity(adText, existingText)
                            return similarity > 0.8
                        })
                    }

                    if (hasGoodSize && reasonableLinkCount && isUnique && isContentUnique) {
                        foundAdCards.push(div)
                    }
                }
            })
        }

        // Process found ad cards
        foundAdCards.forEach((div, index) => {
            const text = div.textContent || ''

            // Use the helper function for more reliable Library ID extraction
            const getTextByLabel = (label) => {
                const el = [...div.querySelectorAll("span, div")]
                    .find(e => e.innerText?.trim().startsWith(label));
                return el ? el.innerText.replace(label, "").trim() : null;
            };

            // Enhanced Library ID extraction
            let libraryId = getTextByLabel("Library ID:") || getTextByLabel("library id:")

            // Try alternative methods to find Library ID
            if (!libraryId) {
                // Look for pattern "Library ID: 123456" in text content
                const text = div.textContent || ''
                const libraryIdMatch = text.match(/Library ID:\s*(\d+)/i)
                if (libraryIdMatch) {
                    libraryId = libraryIdMatch[1]
                }
            }

            // Still no Library ID found, but this might be a valid ad
            if (!libraryId) {
                // Check if this content is already captured by a previous ad
                const adText = div.textContent || ''
                const isDuplicate = potentialAdCards.some(card => {
                    const existingText = card.container?.textContent || ''
                    // Check if 80% of the text content overlaps
                    const similarity = this.calculateTextSimilarity(adText, existingText)
                    return similarity > 0.8
                })

                if (isDuplicate) {
                    return // Skip this duplicate content
                }

                // Generate fallback ID only if this seems like a genuine unique ad
                libraryId = `ad_${index}_${Date.now()}`
            }

            // Skip verbose container logging - focus on API payload

            // Make sure it's not a duplicate (same ID already processed)
            const isUnique = !potentialAdCards.some(card => card.libraryId === libraryId)

            if (isUnique) {
                const adCard = this.analyzeAdCard(div, libraryId)
                potentialAdCards.push(adCard)
            }
        })

        console.log(`✅ AdBoard: Found ${potentialAdCards.length} unique ad cards`)

        // Inject save buttons for detected ads
        potentialAdCards.forEach((card, index) => {
            // Inject save button for this ad card
            this.injectSaveButton(card)
        })

        // Reset processing flag
        this.processingAds = false

        console.log('✅ AdBoard: Ad card detection completed (Call ID:', callId, ')')
        return potentialAdCards
    }

    analyzeAdCard(container, libraryId) {
        const text = container.textContent || ''

        // Helper function to extract text by label (like the reference code)
        const getTextByLabel = (label) => {
            const el = [...container.querySelectorAll("span, div")]
                .find(e => e.innerText?.trim().startsWith(label));
            return el ? el.innerText.replace(label, "").trim() : null;
        };

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

                    // Found ad text

                    adText = elementText
                    break
                }
            }
            if (adText) break
        }

        // Extract media - prioritize videos and their posters, then main images
        const mediaUrls = []
        const processedUrls = new Set() // Track URLs to avoid duplicates

        // First, look for videos (limit to 1 video max to avoid clutter)
        const videos = container.querySelectorAll('video')
        let videosProcessed = 0
        const maxVideos = 1 // Reduce to 1 to limit media

        videos.forEach(video => {
            if (videosProcessed >= maxVideos) return

            let addedVideoSrc = false
            let addedVideoPoster = false

            // Add video source
            if (video.src && video.src.includes('fbcdn') && !processedUrls.has(video.src)) {
                mediaUrls.push({
                    url: video.src,
                    type: 'video',
                    source: 'video_src'
                })
                processedUrls.add(video.src)
                addedVideoSrc = true
            }

            // Add video poster (thumbnail) for the same video
            if (video.poster && video.poster.includes('fbcdn') && !processedUrls.has(video.poster)) {
                mediaUrls.push({
                    url: video.poster,
                    type: 'image',
                    source: 'video_poster'
                })
                processedUrls.add(video.poster)
                addedVideoPoster = true
            }

            // Only count as processed if we actually added something
            if (addedVideoSrc || addedVideoPoster) {
                videosProcessed++
            }
        })

        // Videos processed

        // Then look for main content images (skip profile pics and small images)
        const images = container.querySelectorAll('img')
        let imageCount = 0
        // If we have videos, limit images to 1, otherwise allow up to 3
        const maxImages = videosProcessed > 0 ? 1 : 3

        images.forEach(img => {
            if (imageCount >= maxImages) return

            if (img.src && (img.src.includes('fbcdn') || img.src.includes('scontent')) && !processedUrls.has(img.src)) {
                // Skip small profile images and icons based on URL patterns
                const isSmallImage = img.src.includes('_s60x60') ||
                    img.src.includes('_s40x40') ||
                    img.src.includes('_s32x32') ||
                    img.src.includes('s60x60_') ||
                    img.src.includes('s40x40_') ||
                    img.src.includes('s32x32_') ||
                    img.src.includes('_p148x148') // Skip tiny profile images

                // Skip brand profile images (they're handled separately)
                const isBrandImage = img.alt && brandName && img.alt.toLowerCase() === brandName.toLowerCase()

                // Get actual image dimensions from URL if available
                const urlSizeMatch = img.src.match(/s(\d+)x(\d+)/)
                let isLargeEnough = true
                if (urlSizeMatch) {
                    const width = parseInt(urlSizeMatch[1])
                    const height = parseInt(urlSizeMatch[2])
                    isLargeEnough = width >= 300 || height >= 300 // Higher threshold for main content
                } else {
                    // Fallback to DOM dimensions if no URL size info
                    isLargeEnough = img.offsetWidth >= 150 || img.offsetHeight >= 150
                }

                if (!isSmallImage && !isBrandImage && isLargeEnough) {
                    mediaUrls.push({
                        url: img.src,
                        type: 'image',
                        source: 'main_image',
                        alt: img.alt || ''
                    })
                    processedUrls.add(img.src)
                    imageCount++
                    // Added image
                }
            }
        })

        // Media processing complete

        // Check for various elements
        const hasImages = images.length > 0
        const hasVideos = videos.length > 0
        const hasButtons = container.querySelectorAll('button, [role="button"], a[href]').length > 0
        const hasSponsored = text.includes('Sponsored')
        const hasSeeAdDetails = text.includes('See ad details')

        // Helper function to get higher quality brand image URL
        const getHighQualityBrandImageUrl = (url) => {
            if (!url || !url.includes('fbcdn')) return url

            try {
                let improvedUrl = url

                // Handle different Facebook image URL patterns
                if (url.includes('t39.30808-1')) {
                    // Page header/cover images - upgrade p148x148 to p400x400
                    improvedUrl = url
                        .replace(/stp=dst-jpg_p\d+x\d+/g, 'stp=dst-jpg_p400x400')
                        .replace(/_p\d+x\d+/g, '_p400x400')
                } else {
                    // Regular profile images - upgrade s60x60 to s400x400
                    improvedUrl = url
                        .replace(/_s\d+x\d+/g, '_s400x400')
                        .replace(/stp=dst-jpg_s\d+x\d+/g, 'stp=dst-jpg_s400x400')
                }

                // Validate the URL still looks correct
                if (improvedUrl.includes('fbcdn') && (improvedUrl.includes('400x400') || improvedUrl.includes('p400x400'))) {
                    return improvedUrl
                }

                // Fallback to original if transformation seems wrong
                return url
            } catch (error) {
                console.warn('Error improving brand image URL:', error)
                return url
            }
        }

        // Extract brand image URL (next to brand name)
        let brandImageUrl = ''

        // Strategy 1: Try to get brand image from page header (use original URL - no quality upgrade)
        // Look for the main page profile image at the top of the page
        const pageHeaderImage = document.querySelector('img[height="80"][width="80"], img[src*="t39.30808-1"]')
        if (pageHeaderImage && pageHeaderImage.src && pageHeaderImage.src.includes('fbcdn')) {
            brandImageUrl = pageHeaderImage.src // Use original URL to avoid signature mismatch
            console.log('🎯 Found page header brand image (original):', brandImageUrl.substring(0, 100) + '...')
        }

        // Strategy 2: Use the brand name to find the matching profile image (fallback)
        // This is more reliable than size-based filtering
        if (!brandImageUrl && brandName) {
            const brandImage = container.querySelector(`img[alt="${brandName}"]`)
            if (brandImage && brandImage.src && brandImage.src.includes('fbcdn')) {
                brandImageUrl = brandImage.src // Use original URL to avoid signature mismatch
                console.log('🎯 Found ad-level brand image (original):', brandImageUrl.substring(0, 100) + '...')
            }
        }

        // Fallback: If no brand image found by alt text, try size-based approach
        if (!brandImageUrl) {
            const brandImageSelectors = [
                'img[src*="_s60x60"][src*="fbcdn"]',
                'img[src*="_s40x40"][src*="fbcdn"]',
                'img[src*="_s32x32"][src*="fbcdn"]'
            ]

            for (const selector of brandImageSelectors) {
                const brandImages = container.querySelectorAll(selector)
                for (const brandImage of brandImages) {
                    if (brandImage && brandImage.src && brandImage.src.includes('fbcdn')) {
                        brandImageUrl = brandImage.src // Use original URL to avoid signature mismatch
                        console.log('🎯 Found brand image by size (original):', brandImageUrl.substring(0, 100) + '...')
                        break
                    }
                }
                if (brandImageUrl) break
            }
        }

        // Extract page ID from URL
        let pageId = ''
        const urlMatch = window.location.href.match(/view_all_page_id=(\d+)/)
        if (urlMatch) {
            pageId = urlMatch[1]
        }

        // Extract ad status (Active/Inactive)
        let adStatus = ''
        // Look for status text in the metadata section
        const statusElements = container.querySelectorAll('span')
        for (const element of statusElements) {
            const text = element.textContent?.trim()
            if (text === 'Active' || text === 'Inactive') {
                adStatus = text
                // Found status
                break
            }
        }
        // Fallback: check for status indicators by icon or other patterns
        if (!adStatus) {
            // Look for active/inactive indicators in the container text
            const containerText = container.textContent || ''
            if (containerText.includes('Active')) {
                adStatus = 'Active'
            } else if (containerText.includes('Inactive')) {
                adStatus = 'Inactive'
            }
        }

        // Extract date information
        let startDate = ''
        let endDate = ''
        let dateRange = ''

        // Look for date patterns in the metadata
        const containerText = container.textContent || ''

        // Pattern 1: "Started running on [date]"
        const startDateMatch = containerText.match(/Started running on ([^,\n]+)/i)
        if (startDateMatch) {
            startDate = startDateMatch[1].trim()
            // Found start date
        }

        // Pattern 2: "Dec 1, 2021 - Dec 3, 2021" (date range)
        const dateRangeMatch = containerText.match(/([A-Za-z]{3} \d{1,2}, \d{4}) - ([A-Za-z]{3} \d{1,2}, \d{4})/i)
        if (dateRangeMatch) {
            startDate = dateRangeMatch[1].trim()
            endDate = dateRangeMatch[2].trim()
            dateRange = `${startDate} - ${endDate}`
            // Found date range
        }

        // If no structured dates found, look for any date-like patterns
        if (!startDate && !dateRange) {
            const spanElements = container.querySelectorAll('span')
            for (const element of spanElements) {
                const text = element.textContent?.trim()
                if (text && (text.match(/\w+ \d{1,2}, \d{4}/) || text.match(/\d{4}-\d{2}-\d{2}/))) {
                    if (text.includes(' - ')) {
                        dateRange = text
                        const parts = text.split(' - ')
                        startDate = parts[0]?.trim()
                        endDate = parts[1]?.trim()
                    } else {
                        startDate = text
                    }
                    // Found date from span
                    break
                }
            }
        }

        // Extract platforms from icons
        let platforms = []

        // Look for platform indicators in the Platforms section
        // Find the "Platforms" text and then look for icons near it
        const platformsSection = Array.from(container.querySelectorAll('span')).find(span =>
            span.textContent?.trim() === 'Platforms'
        )

        if (platformsSection) {
            // Look for platform icons near the Platforms section
            const platformContainer = platformsSection.closest('div')
            if (platformContainer) {
                // Look for div elements with mask-image styles (Facebook's icon system)
                const iconElements = platformContainer.querySelectorAll('div[style*="mask-image"]')

                iconElements.forEach(icon => {
                    const style = icon.getAttribute('style') || ''

                    // Platform detection based on icon mask positions (these are Facebook's internal icon positions)
                    if (style.includes('-1184px')) {
                        platforms.push('Facebook')
                    } else if (style.includes('-419px')) {
                        platforms.push('Instagram')
                    } else if (style.includes('-528px')) {
                        platforms.push('Messenger')
                    } else if (style.includes('-458px')) {
                        platforms.push('Audience Network')
                    }
                })
            }
        }

        // Fallback: look for platform keywords in text
        if (platforms.length === 0) {
            if (containerText.includes('Facebook')) platforms.push('Facebook')
            if (containerText.includes('Instagram')) platforms.push('Instagram')
            if (containerText.includes('Messenger')) platforms.push('Messenger')
            if (containerText.includes('Audience Network')) platforms.push('Audience Network')
        }

        // Remove duplicates
        platforms = [...new Set(platforms)]
        // Platforms detected

        // Extract CTA (Call-to-Action) link
        let cta = ''
        let ctaType = ''
        let ctaUrl = ''

        // Strategy: Look specifically for the main CTA button/link in the ad
        // Focus on the primary action button, not system links

        // Debug: Log all external links to see what we're working with
        const allExternalLinks = container.querySelectorAll('a[href*="http"]')
        // External links found for CTA detection

        // First, try to find the main CTA button by looking for common patterns
        const ctaSelectors = [
            // Look for Facebook tracking links (most common for ads)
            'a[href*="l.facebook.com"]',
            // Look for direct external links
            'a[target="_blank"]:not([href*="www.facebook.com"]):not([href*="metastatus.com"])',
            // Look for buttons with CTA text
            'div[role="button"] a:not([href*="www.facebook.com"]):not([href*="metastatus.com"])',
            // Look for any external link that's not Facebook profile/system links
            'a[href*="http"]:not([href*="www.facebook.com"]):not([href*="metastatus.com"])'
        ]

        for (const selector of ctaSelectors) {
            const ctaLinks = container.querySelectorAll(selector)
            // Checking CTA selector

            for (const link of ctaLinks) {
                const href = link.href

                // Try to get more precise text - prefer direct text content over nested elements
                let text = ''

                // First, try to get text from direct text nodes or specific button/span elements
                const directTextNodes = []
                for (const child of link.childNodes) {
                    if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
                        directTextNodes.push(child.textContent.trim())
                    }
                }

                // If we have direct text nodes, use those
                if (directTextNodes.length > 0) {
                    text = directTextNodes.join(' ').trim()
                } else {
                    // Look for specific CTA-like elements within the link
                    const ctaTextElement = link.querySelector('span, div[class*="button"], div[role="button"]')
                    if (ctaTextElement) {
                        text = ctaTextElement.textContent?.trim() || ''
                    } else {
                        // Fallback to link text content, but limit length to avoid grabbing too much
                        const fullText = link.textContent?.trim() || ''
                        // Limit to reasonable CTA length
                        text = fullText.length > 50 ? fullText.substring(0, 50).trim() : fullText
                    }
                }

                // Skip obvious system links and metadata, but be more lenient
                if (href &&
                    !href.includes('metastatus.com') &&
                    !href.includes('www.facebook.com/') && // Allow l.facebook.com
                    !text.includes('Library ID') &&
                    !text.includes('See ad details') &&
                    !text.includes('System status')) {

                    // Clean up the URL (remove Facebook's tracking parameters)
                    let cleanUrl = href
                    if (href.includes('l.facebook.com')) {
                        const urlMatch = href.match(/u=([^&]+)/)
                        if (urlMatch) {
                            cleanUrl = decodeURIComponent(urlMatch[1])
                        }
                    }

                    // Check if this looks like a valid CTA
                    const ctaKeywords = ['shop', 'buy', 'learn', 'sign', 'get', 'download', 'visit', 'try', 'order', 'claim', 'start', 'join', 'now', 'more']
                    const hasCtaKeyword = ctaKeywords.some(keyword =>
                        text.toLowerCase().includes(keyword.toLowerCase())
                    )

                    // Accept if it has CTA keywords OR if it's a non-empty text with reasonable length
                    if (hasCtaKeyword || (text && text.length > 0 && text.length <= 50)) {
                        // Parse CTA to separate text and type
                        const ctaData = this.parseCtaText(text)
                        cta = ctaData.text
                        ctaType = ctaData.type
                        ctaUrl = cleanUrl
                        break
                    }
                }
            }
            if (cta) break
        }

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
            size: container.getBoundingClientRect(),
            brandImageUrl,
            pageId,
            adStatus,
            startDate,
            endDate,
            dateRange,
            platforms,
            cta,
            ctaType,
            ctaUrl
        }

        // Log the complete API payload that would be sent
        console.log('📝 API Payload for ad:', {
            pageId,
            adStatus,
            libraryId,
            startDate,
            endDate,
            dateRange,
            platforms,
            brandImageUrl,
            brandName,
            adText,
            headline: adText.substring(0, 100) + (adText.length > 100 ? '...' : ''),
            mediaDetails: mediaUrls,
            cta,
            ctaType,
            ctaUrl,
            fbAdId: libraryId, // Keep for backward compatibility
            firstSeenDate: new Date().toISOString(),
            lastSeenDate: new Date().toISOString()
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

        // Store adCard data on the button for later reference
        saveButton.adCardData = adCard

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

    // Update all existing save buttons to reflect current state
    updateAllSaveButtons() {
        const existingButtons = document.querySelectorAll('.adboard-save-btn')
        console.log(`🔄 AdBoard: Updating ${existingButtons.length} existing save buttons`)

        existingButtons.forEach(button => {
            // Reset button state
            button.disabled = false
            button.style.cursor = 'pointer'
            button.style.backgroundColor = '#1877f2'

            if (!this.isInitialized) {
                // Still loading
                button.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    Loading...
                `
                button.disabled = true
                button.style.cursor = 'not-allowed'
                button.style.backgroundColor = '#ccc'
            } else if (this.extensionFailed) {
                // Extension failed - show error
                button.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v-2h-2v2zm0-4h2V7h-2v6z"/>
                    </svg>
                    Extension Error
                `
                button.disabled = true
                button.style.cursor = 'not-allowed'
                button.style.backgroundColor = '#dc3545'
            } else if (!this.sessionValid) {
                // Session invalid - show login required
                button.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z"/>
                    </svg>
                    Login Required
                `
                button.disabled = true
                button.style.cursor = 'not-allowed'
                button.style.backgroundColor = '#ccc'
            } else {
                // Ready to use
                button.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                    </svg>
                    Add to AdBoard
                `
                button.disabled = false
                button.style.cursor = 'pointer'
                button.style.backgroundColor = '#1877f2'

                // Clear existing event listeners and re-add them
                const newButton = button.cloneNode(true)
                button.parentNode?.replaceChild(newButton, button)

                // Re-add event listeners for hover effects and click handler
                newButton.addEventListener('mouseenter', () => {
                    newButton.style.backgroundColor = '#166fe5'
                })
                newButton.addEventListener('mouseleave', () => {
                    newButton.style.backgroundColor = '#1877f2'
                })

                // Re-add click handler if we have adCard data
                if (newButton.adCardData) {
                    newButton.addEventListener('click', (e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        this.showMultiBoardDialog(newButton.adCardData)
                    })
                }
            }
        })
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
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
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

            // Show loading state on the button
            const saveBtn = dialog.querySelector('#saveBtn')
            const originalText = saveBtn.innerHTML
            saveBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="animation: spin 1s linear infinite; margin-right: 8px;">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                Saving...
            `
            saveBtn.disabled = true
            saveBtn.style.opacity = '0.7'
            saveBtn.style.cursor = 'not-allowed'

            try {
                // Save to all boards in one API call
                await this.saveAdToMultipleBoards(adCard, selectedBoardIds)
                dialog.closest('div[style*="position: fixed"]').remove()
            } catch (error) {
                // Reset button state on error
                saveBtn.innerHTML = originalText
                saveBtn.disabled = false
                saveBtn.style.opacity = '1'
                saveBtn.style.cursor = 'pointer'
                console.error('❌ Error saving ad:', error)
                alert('Failed to save ad. Please try again.')
            }
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
                    pageId: adCard.pageId,
                    adStatus: adCard.adStatus,
                    libraryId: adCard.libraryId,
                    startDate: adCard.startDate,
                    endDate: adCard.endDate,
                    dateRange: adCard.dateRange,
                    platforms: adCard.platforms,
                    brandImageUrl: adCard.brandImageUrl,
                    brandName: adCard.brandName,
                    adText: adCard.adText,
                    headline: adCard.adText ? adCard.adText.substring(0, 100) : '',
                    mediaDetails: adCard.mediaDetails,
                    cta: adCard.cta || '',
                    ctaType: adCard.ctaType || '',
                    ctaUrl: adCard.ctaUrl || '',
                    firstSeenDate: new Date().toISOString(),
                    lastSeenDate: new Date().toISOString(),
                    // Legacy fields for backward compatibility
                    fbAdId: adCard.libraryId,
                    description: ''
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
                    pageId: adCard.pageId,
                    adStatus: adCard.adStatus,
                    libraryId: adCard.libraryId,
                    startDate: adCard.startDate,
                    endDate: adCard.endDate,
                    dateRange: adCard.dateRange,
                    platforms: adCard.platforms,
                    brandImageUrl: adCard.brandImageUrl,
                    brandName: adCard.brandName,
                    adText: adCard.adText,
                    headline: adCard.adText ? adCard.adText.substring(0, 100) : '',
                    mediaDetails: adCard.mediaDetails,
                    cta: adCard.cta || '',
                    ctaType: adCard.ctaType || '',
                    ctaUrl: adCard.ctaUrl || '',
                    firstSeenDate: new Date().toISOString(),
                    lastSeenDate: new Date().toISOString(),
                    // Legacy fields for backward compatibility
                    fbAdId: adCard.libraryId,
                    description: ''
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
            if (this.isObserving) return // Prevent multiple simultaneous observations

            clearTimeout(debounceTimer)
            debounceTimer = setTimeout(() => {
                const observerCallId = Date.now()
                console.log('🔄 AdBoard: Page changed, re-detecting ads... (Observer Call ID:', observerCallId, ')')
                this.isObserving = true
                this.detectAndLogAdCards()
                setTimeout(() => {
                    this.isObserving = false
                    console.log('🔄 AdBoard: Observer reset (Observer Call ID:', observerCallId, ')')
                }, 1000) // Reset after 1 second
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

    calculateTextSimilarity(text1, text2) {
        if (!text1 || !text2) return 0

        // Normalize texts (remove extra whitespace, convert to lowercase)
        const normalize = (text) => text.replace(/\s+/g, ' ').trim().toLowerCase()
        const norm1 = normalize(text1)
        const norm2 = normalize(text2)

        if (norm1 === norm2) return 1

        // Simple Jaccard similarity using word sets
        const words1 = new Set(norm1.split(' '))
        const words2 = new Set(norm2.split(' '))

        const intersection = new Set([...words1].filter(word => words2.has(word)))
        const union = new Set([...words1, ...words2])

        return intersection.size / union.size
    }

    // Parse CTA text to separate content from button type
    parseCtaText(text) {
        if (!text) return { text: '', type: '' }

        // Clean up common problematic patterns first
        let cleanText = text

        // Remove domain patterns that often get mixed in
        cleanText = cleanText.replace(/[A-Z0-9]+\.(COM|NET|ORG|IO|CO|UK|CA|AU)/gi, '').trim()

        // Remove www patterns
        cleanText = cleanText.replace(/www\.[a-zA-Z0-9.-]+/gi, '').trim()

        // Remove standalone brand names that appear before CTA
        // Pattern: "BrandNameLearn more" -> "Learn more"
        cleanText = cleanText.replace(/([A-Z][a-z]+)([A-Z][a-z]+\s+(More|Now|Today|Here|Info))/g, '$2').trim()

        // Pattern: "BRANDNAME.COMBrandLearn more" -> "Learn more"
        cleanText = cleanText.replace(/[A-Z0-9]+\.[A-Z]+[A-Z][a-z]+([A-Z][a-z]+\s+[A-Z][a-z]+)/g, '$1').trim()

        // Remove common website/social patterns
        cleanText = cleanText.replace(/(Visit our website|Follow us|Like us|Join us)/gi, '').trim()

        // Clean up repeated capitalized words (often brand names)
        cleanText = cleanText.replace(/([A-Z][a-z]+)\1+/g, '$1').trim()

        // Remove extra spaces and normalize
        cleanText = cleanText.replace(/\s+/g, ' ').trim()

        // If the cleaned text is too short or empty, keep more of the original
        if (cleanText.length < 3 && text.length > cleanText.length) {
            // Try a less aggressive cleaning
            cleanText = text.replace(/[A-Z0-9]+\.(COM|NET|ORG)/gi, '').replace(/\s+/g, ' ').trim()
        }

        // Comprehensive list of Facebook CTA button types
        const ctaTypes = [
            // Action CTAs
            'Shop Now', 'Buy Now', 'Order Now', 'Purchase', 'Add to Cart',
            'Book Now', 'Reserve', 'Schedule', 'Appointment',

            // Information CTAs  
            'Learn More', 'See More', 'Read More', 'Find Out More', 'Discover',
            'Get Info', 'Request Info', 'Get Details', 'View Details',

            // Engagement CTAs
            'Sign Up', 'Register', 'Join', 'Join Now', 'Subscribe', 'Follow',
            'Get Started', 'Start Now', 'Begin', 'Try Now', 'Try Free',

            // Download/Install CTAs
            'Download', 'Install', 'Get App', 'Download App', 'Install App',
            'Get it on Google Play', 'Download on App Store',

            // Communication CTAs
            'Contact Us', 'Call Now', 'Message', 'Send Message', 'Chat',
            'Get Quote', 'Request Quote', 'Inquire',

            // Website CTAs
            'Visit Website', 'Visit Site', 'Go to Website', 'Website',
            'View Website', 'See Website',

            // Media CTAs
            'Watch Now', 'Watch Video', 'Play Now', 'Listen', 'View',
            'See Photos', 'Watch', 'Play',

            // Application CTAs
            'Apply Now', 'Apply', 'Submit', 'Donate', 'Donate Now',
            'Get Directions', 'Find Location', 'Locate',

            // Generic action words that might be CTAs
            'Continue', 'Next', 'Submit', 'Send', 'Go'
        ]

        // Find if any CTA type exists in the cleaned text (case-insensitive)
        for (const type of ctaTypes) {
            const lowerCleanText = cleanText.toLowerCase()
            const lowerType = type.toLowerCase()
            const typeIndex = lowerCleanText.lastIndexOf(lowerType)
            if (typeIndex !== -1) {
                // Extract the CTA text (everything before the type)
                const ctaText = cleanText.substring(0, typeIndex).trim()
                return {
                    text: ctaText,
                    type: type // Return the properly capitalized version
                }
            }
        }

        // If no specific CTA type found, treat the cleaned text as CTA
        // but try to identify if it ends with common action words
        const actionWords = ['now', 'today', 'here', 'more']
        const words = cleanText.split(' ')
        const lastWord = words[words.length - 1]?.toLowerCase()

        if (actionWords.includes(lastWord) && words.length > 1) {
            // Likely that the last word is part of a CTA type
            const possibleType = words.slice(-2).join(' ')
            const possibleText = words.slice(0, -2).join(' ')

            if (possibleText.length > 0) {
                return {
                    text: possibleText,
                    type: possibleType
                }
            }
        }

        // Default: return the cleaned text as CTA with no specific type
        return {
            text: cleanText || text, // Use cleaned text if available, fallback to original
            type: ''
        }
    }

    // Wait for extension to be fully ready with retries
    async waitForExtensionReady(maxAttempts = 5) {
        console.log('🔄 AdBoard: Waiting for extension to be ready...')

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`🔄 AdBoard: Extension readiness check attempt ${attempt}/${maxAttempts}`)

                // Check if chrome.runtime is available
                if (!chrome.runtime || !chrome.runtime.id) {
                    console.log(`⏳ AdBoard: Chrome runtime not available yet (attempt ${attempt})`)
                    await new Promise(resolve => setTimeout(resolve, 1000))
                    continue
                }

                // Try to ping the extension
                const response = await this.sendMessageWithRetry({ type: 'PING' }, 1)
                if (response?.success) {
                    console.log('✅ AdBoard: Extension is ready!')
                    return true
                }

                console.log(`⏳ AdBoard: Extension not responding yet (attempt ${attempt})`)
                await new Promise(resolve => setTimeout(resolve, 1000))

            } catch (error) {
                console.log(`⏳ AdBoard: Extension readiness check failed (attempt ${attempt}):`, error.message)

                // If it's a context invalidation error, don't retry
                if (error.message && (
                    error.message.includes('Extension context invalidated') ||
                    error.message.includes('Could not establish connection')
                )) {
                    console.warn('⚠️ AdBoard: Extension context invalidated during readiness check')
                    return false
                }

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 1000))
            }
        }

        console.warn('⚠️ AdBoard: Extension not ready after all attempts')
        return false
    }

    // Check if extension is working properly
    async checkExtensionHealth() {
        try {
            console.log('🔍 AdBoard: Checking extension health...')

            // Check if chrome.runtime is available and valid
            if (!chrome.runtime || !chrome.runtime.id) {
                console.warn('⚠️ AdBoard: Chrome runtime not available')
                return false
            }

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

            // Check for specific extension context errors
            if (error.message && (
                error.message.includes('Extension context invalidated') ||
                error.message.includes('Could not establish connection') ||
                error.message.includes('chrome.runtime is not defined')
            )) {
                console.warn('⚠️ AdBoard: Extension context is invalid - extension may have been reloaded')
                this.handleExtensionContextInvalid()
                return false
            }

            // Check for fetch errors (common during extension reload)
            if (error.message && (
                error.message.includes('Failed to fetch') ||
                error.message.includes('NetworkError') ||
                error.message.includes('ERR_FAILED')
            )) {
                console.warn('⚠️ AdBoard: Network/fetch error detected - extension may still be initializing')
                // Don't treat this as a fatal error, just return false to retry later
                return false
            }

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

// Initialize when page loads - ensure only one instance
let adBoardInstance = null

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!adBoardInstance) {
            console.log('🚀 AdBoard: Initializing on DOMContentLoaded...')
            adBoardInstance = new AdBoardSaver()
        } else {
            console.log('⚠️ AdBoard: Instance already exists, skipping...')
        }
    })
} else {
    if (!adBoardInstance) {
        console.log('🚀 AdBoard: Initializing immediately...')
        adBoardInstance = new AdBoardSaver()
    } else {
        console.log('⚠️ AdBoard: Instance already exists, skipping...')
    }
}
