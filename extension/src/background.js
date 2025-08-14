// AdBoard Chrome Extension Background Script

chrome.runtime.onInstalled.addListener(() => {
    console.log('AdBoard extension installed')
})

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    // This will be handled by the popup
})

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'notification') {
        // Show browser notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon-48.png',
            title: 'AdBoard',
            message: request.message
        })
    }

    return true
})