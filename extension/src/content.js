// Content script to detect and mark Facebook ads for easy saving

class AdBoardFacebookDetector {
    constructor() {
        this.savedAds = new Set()
        this.init()
    }

    init() {
        // Wait for page to load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.start())
        } else {
            this.start()
        }
    }

    start() {
        console.log('AdBoard: Facebook ad detector started')

        // Initial scan
        this.scanForAds()

        // Set up observer for dynamic content
        this.setupObserver()

        // Listen for messages from popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'getCurrentAdUrl') {
                const adUrl = this.getCurrentAdUrl()
                sendResponse({ adUrl })
            }
        })
    }

    scanForAds() {
        // Look for sponsored posts in feed
        const sponsoredPosts = document.querySelectorAll('[data-pagelet*="FeedUnit"]')

        sponsoredPosts.forEach(post => {
            if (this.isSponsored(post) && !post.hasAttribute('data-adboard-processed')) {
                this.processAdPost(post)
            }
        })

        // Look for ads in Ad Library
        if (window.location.pathname === '/ads/library/') {
            this.processAdLibraryPage()
        }
    }

    isSponsored(element) {
        // Check for "Sponsored" text
        const text = element.textContent || ''
        return text.includes('Sponsored') ||
            text.includes('Publicidade') || // Portuguese
            text.includes('Sponsorisé') ||  // French
            text.includes('Gesponsert') ||  // German
            text.includes('Patrocinado')    // Spanish
    }

    processAdPost(postElement) {
        postElement.setAttribute('data-adboard-processed', 'true')

        // Add save button
        const saveButton = this.createSaveButton()

        // Find the best place to insert the button
        const actionBar = postElement.querySelector('[role="toolbar"], .x1i10hfl, [data-testid*="action"]')

        if (actionBar) {
            // Clone the action bar styling for our button
            const buttonContainer = document.createElement('div')
            buttonContainer.className = 'adboard-save-container'
            buttonContainer.appendChild(saveButton)

            // Insert after the action bar
            actionBar.parentNode.insertBefore(buttonContainer, actionBar.nextSibling)
        } else {
            // Fallback: add to the end of the post
            postElement.appendChild(saveButton)
        }

        // Store reference to the post for saving
        saveButton.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            this.saveAd(postElement)
        })
    }

    processAdLibraryPage() {
        // For Ad Library pages, add a save button to the main ad
        const adContainer = document.querySelector('[data-testid="ad_library_ads_container"]')

        if (adContainer && !adContainer.hasAttribute('data-adboard-processed')) {
            adContainer.setAttribute('data-adboard-processed', 'true')

            const saveButton = this.createSaveButton('Save to AdBoard')
            saveButton.addEventListener('click', () => {
                this.saveCurrentPageAd()
            })

            // Add button to a prominent position
            const header = document.querySelector('h1, [role="heading"]')
            if (header) {
                header.parentNode.insertBefore(saveButton, header.nextSibling)
            }
        }
    }

    createSaveButton(text = 'Save Ad') {
        const button = document.createElement('button')
        button.className = 'adboard-save-btn'
        button.textContent = text
        button.title = 'Save this ad to AdBoard'

        return button
    }

    getCurrentAdUrl() {
        // For Ad Library pages
        if (window.location.pathname === '/ads/library/') {
            return window.location.href
        }

        // For feed posts, try to extract the ad URL
        // This is complex because Facebook doesn't expose ad URLs directly
        // We'll need to use various methods to get the ad link

        return window.location.href
    }

    async saveAd(postElement) {
        try {
            // Extract ad URL - this is the tricky part
            let adUrl = this.extractAdUrl(postElement)

            if (!adUrl) {
                // Fallback: use current page URL
                adUrl = window.location.href
            }

            // Get API credentials from storage
            const result = await chrome.storage.sync.get(['apiUrl', 'apiToken'])

            if (!result.apiToken) {
                this.showNotification('Please configure your AdBoard API token in the extension settings', 'error')
                return
            }

            // Send to AdBoard API
            const response = await fetch(`${result.apiUrl || 'http://localhost:3000'}/api/v1/ext/assets/fb`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${result.apiToken}`
                },
                body: JSON.stringify({
                    adUrl: adUrl,
                    tags: ['chrome-extension']
                })
            })

            if (response.ok) {
                const data = await response.json()
                this.showNotification('Ad saved to AdBoard!', 'success')

                // Mark as saved
                const button = postElement.querySelector('.adboard-save-btn')
                if (button) {
                    button.textContent = '✓ Saved'
                    button.disabled = true
                }
            } else {
                const errorData = await response.json()
                this.showNotification(`Error: ${errorData.error}`, 'error')
            }

        } catch (error) {
            console.error('AdBoard save error:', error)
            this.showNotification('Failed to save ad. Please try again.', 'error')
        }
    }

    async saveCurrentPageAd() {
        const adUrl = window.location.href

        try {
            const result = await chrome.storage.sync.get(['apiUrl', 'apiToken'])

            if (!result.apiToken) {
                this.showNotification('Please configure your AdBoard API token', 'error')
                return
            }

            const response = await fetch(`${result.apiUrl || 'http://localhost:3000'}/api/v1/ext/assets/fb`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${result.apiToken}`
                },
                body: JSON.stringify({
                    adUrl: adUrl,
                    tags: ['ad-library']
                })
            })

            if (response.ok) {
                this.showNotification('Ad saved to AdBoard!', 'success')
            } else {
                const errorData = await response.json()
                this.showNotification(`Error: ${errorData.error}`, 'error')
            }

        } catch (error) {
            console.error('AdBoard save error:', error)
            this.showNotification('Failed to save ad', 'error')
        }
    }

    extractAdUrl(postElement) {
        // Try to find ad links in the post
        const links = postElement.querySelectorAll('a[href*="ads/library"]')

        if (links.length > 0) {
            return links[0].href
        }

        // Try to extract from "Copy link" or similar functionality
        // This is Facebook-specific and may need updates
        const copyLinkBtn = postElement.querySelector('[aria-label*="link"], [aria-label*="Copy"]')

        // For now, return null and let the API handle the current page URL
        return null
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div')
        notification.className = `adboard-notification adboard-notification-${type}`
        notification.textContent = message

        // Add to page
        document.body.appendChild(notification)

        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove()
        }, 3000)
    }

    setupObserver() {
        // Watch for new content being added to the page
        const observer = new MutationObserver((mutations) => {
            let shouldScan = false

            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length > 0) {
                    shouldScan = true
                }
            })

            if (shouldScan) {
                // Debounce the scanning
                clearTimeout(this.scanTimeout)
                this.scanTimeout = setTimeout(() => {
                    this.scanForAds()
                }, 500)
            }
        })

        observer.observe(document.body, {
            childList: true,
            subtree: true
        })
    }
}

// Initialize the detector
new AdBoardFacebookDetector()