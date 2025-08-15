// AdBoard Chrome Extension - Popup Script

document.addEventListener('DOMContentLoaded', async () => {
    const ADBOARD_URL = 'http://localhost:3000' // Change for production

    const statusDot = document.getElementById('status-dot')
    const statusText = document.getElementById('status-text')
    const dashboardBtn = document.getElementById('dashboard-btn')
    const saveBtn = document.getElementById('save-btn')
    const helpBtn = document.getElementById('help-btn')

    // Set dashboard URL
    dashboardBtn.href = `${ADBOARD_URL}/dashboard`
    dashboardBtn.target = '_blank'

    // Help button
    helpBtn.addEventListener('click', () => {
        chrome.tabs.create({
            url: 'https://github.com/your-username/adboard#chrome-extension'
        })
    })

    try {
        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

        if (!tab.url) {
            setStatus('inactive', 'Unable to access page')
            return
        }

        // Check if we're on Facebook Ad Library
        if (!tab.url.includes('facebook.com/ads/library')) {
            setStatus('inactive', 'Navigate to Facebook Ad Library')
            return
        }

        // Check if there's an ad ID in the URL
        const url = new URL(tab.url)
        const adId = url.searchParams.get('id')
        const pageId = url.searchParams.get('view_all_page_id')

        if (!adId) {
            setStatus('inactive', 'No ad selected')
            return
        }

        if (!pageId) {
            setStatus('inactive', 'No page ID found')
            return
        }

        // We're good to go!
        setStatus('active', `Ready to save ad ${adId}`)
        saveBtn.style.display = 'block'

        // Save button click
        saveBtn.addEventListener('click', async () => {
            saveBtn.textContent = 'Opening save dialog...'
            saveBtn.style.opacity = '0.5'

            try {
                // Inject content script to show save dialog
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: triggerSaveDialog
                })

                // Close popup
                window.close()
            } catch (error) {
                console.error('Failed to trigger save dialog:', error)
                saveBtn.textContent = 'Save Current Ad'
                saveBtn.style.opacity = '1'
            }
        })

    } catch (error) {
        console.error('Error in popup:', error)
        setStatus('inactive', 'Error accessing page')
    }
})

function setStatus(type, text) {
    const statusDot = document.getElementById('status-dot')
    const statusText = document.getElementById('status-text')

    statusDot.className = `status-dot ${type === 'active' ? '' : 'inactive'}`
    statusText.textContent = text
}

// Function to inject into the page
function triggerSaveDialog() {
    // Find the AdBoard save button and click it
    const saveButton = document.getElementById('adboard-save-btn')
    if (saveButton) {
        saveButton.click()
    } else {
        alert('AdBoard save button not found. Please refresh the page and try again.')
    }
}
