// AdBoard Chrome Extension Popup

class AdBoardPopup {
    constructor() {
        this.init()
    }

    async init() {
        // Load saved configuration
        await this.loadConfig()

        // Set up event listeners
        this.setupEventListeners()

        // Check if we're on a Facebook page
        this.checkCurrentPage()
    }

    async loadConfig() {
        const result = await chrome.storage.sync.get(['apiUrl', 'apiToken'])

        if (result.apiUrl) {
            document.getElementById('api-url').value = result.apiUrl
        }

        if (result.apiToken) {
            document.getElementById('api-token').value = result.apiToken
            this.showActionSection()
        }
    }

    setupEventListeners() {
        // Save configuration
        document.getElementById('save-config').addEventListener('click', () => {
            this.saveConfig()
        })

        // Save current ad
        document.getElementById('save-ad').addEventListener('click', () => {
            this.saveCurrentAd()
        })

        // Open AdBoard
        document.getElementById('open-adboard').addEventListener('click', () => {
            this.openAdBoard()
        })

        // Token help
        document.getElementById('token-help').addEventListener('click', (e) => {
            e.preventDefault()
            this.showTokenHelp()
        })
    }

    async saveConfig() {
        const apiUrl = document.getElementById('api-url').value.trim()
        const apiToken = document.getElementById('api-token').value.trim()

        if (!apiUrl || !apiToken) {
            this.showStatus('Please fill in both fields', 'error')
            return
        }

        try {
            // Test the configuration
            const response = await fetch(`${apiUrl}/api/v1/assets?limit=1`, {
                headers: {
                    'Authorization': `Bearer ${apiToken}`
                }
            })

            if (response.ok) {
                // Save configuration
                await chrome.storage.sync.set({ apiUrl, apiToken })
                this.showStatus('Configuration saved successfully!', 'success')
                this.showActionSection()
            } else {
                this.showStatus('Invalid API token or URL', 'error')
            }
        } catch (error) {
            this.showStatus('Could not connect to AdBoard', 'error')
        }
    }

    async saveCurrentAd() {
        try {
            // Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

            if (!tab.url.includes('facebook.com')) {
                this.showStatus('Please navigate to a Facebook ad first', 'warning')
                return
            }

            // Get ad URL from content script
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'getCurrentAdUrl' })

            if (!response || !response.adUrl) {
                this.showStatus('Could not detect Facebook ad on this page', 'warning')
                return
            }

            // Save the ad
            const config = await chrome.storage.sync.get(['apiUrl', 'apiToken'])

            const saveResponse = await fetch(`${config.apiUrl}/api/v1/ext/assets/fb`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiToken}`
                },
                body: JSON.stringify({
                    adUrl: response.adUrl,
                    tags: ['chrome-extension']
                })
            })

            if (saveResponse.ok) {
                const result = await saveResponse.json()
                if (result.status === 'existing') {
                    this.showStatus('Ad already saved to AdBoard', 'success')
                } else {
                    this.showStatus('Ad saved to AdBoard!', 'success')
                }
            } else {
                const errorData = await saveResponse.json()
                this.showStatus(`Error: ${errorData.error}`, 'error')
            }

        } catch (error) {
            console.error('Save ad error:', error)
            this.showStatus('Failed to save ad', 'error')
        }
    }

    async openAdBoard() {
        const config = await chrome.storage.sync.get(['apiUrl'])
        if (config.apiUrl) {
            chrome.tabs.create({ url: config.apiUrl })
        }
    }

    showTokenHelp() {
        this.showStatus('Go to AdBoard → Settings → API Tokens to generate a new token', 'warning')
    }

    async checkCurrentPage() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

            if (tab.url.includes('facebook.com')) {
                // Check if content script is loaded
                try {
                    await chrome.tabs.sendMessage(tab.id, { action: 'ping' })
                } catch (error) {
                    // Content script not loaded, show info
                    this.showStatus('Refresh the page to enable ad detection', 'warning')
                }
            } else {
                this.showStatus('Navigate to Facebook to save ads', 'warning')
            }
        } catch (error) {
            console.error('Error checking current page:', error)
        }
    }

    showActionSection() {
        document.getElementById('config-section').style.display = 'none'
        document.getElementById('action-section').style.display = 'block'
    }

    showStatus(message, type) {
        const statusEl = document.getElementById('status')
        statusEl.textContent = message
        statusEl.className = `status ${type}`
        statusEl.style.display = 'block'

        // Hide after 3 seconds for success messages
        if (type === 'success') {
            setTimeout(() => {
                statusEl.style.display = 'none'
            }, 3000)
        }
    }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new AdBoardPopup()
})