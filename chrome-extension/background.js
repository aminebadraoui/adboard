// AdBoard Chrome Extension - Background Script
// Handles API calls with proper authentication

const ADBOARD_URL = 'http://localhost:3000' // Change for production

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('🎯 Background: Received message:', request.type, 'from tab:', sender.tab?.id)

    if (request.type === 'LOAD_BOARDS') {
        console.log('🎯 Background: Processing LOAD_BOARDS request')
        loadBoards()
            .then(response => {
                console.log('🎯 Background: LOAD_BOARDS success, sending response')
                sendResponse({ success: true, data: response })
            })
            .catch(error => {
                console.error('🚨 Background: LOAD_BOARDS error:', error)
                sendResponse({ success: false, error: error.message })
            })
        return true // Will respond asynchronously
    }

    if (request.type === 'SAVE_AD') {
        console.log('🎯 Background: Processing SAVE_AD request')
        saveAd(request.data)
            .then(response => {
                console.log('🎯 Background: SAVE_AD success, sending response')
                sendResponse({ success: true, data: response })
            })
            .catch(error => {
                console.error('🚨 Background: SAVE_AD error:', error)
                sendResponse({ success: false, error: error.message })
            })
        return true // Will respond asynchronously
    }

    console.log('⚠️ Background: Unknown message type:', request.type)
})

async function loadBoards() {
    console.log('🎯 Background: Loading boards from', `${ADBOARD_URL}/api/v1/boards`)

    // Get ALL cookies for debugging
    const allCookies = await chrome.cookies.getAll({ url: ADBOARD_URL })
    console.log('🔍 Background: All cookies for localhost:3000:', allCookies.map(c => c.name))

    // Try to find NextAuth session cookie (multiple possible names)
    const possibleNames = [
        'next-auth.session-token',
        '__Secure-next-auth.session-token',
        'authjs.session-token',
        '__Secure-authjs.session-token'
    ]

    let sessionCookie = null
    for (const name of possibleNames) {
        const cookies = await chrome.cookies.getAll({ url: ADBOARD_URL, name })
        if (cookies.length > 0) {
            sessionCookie = cookies[0]
            console.log(`🎯 Background: Found auth cookie: ${name}`)
            break
        }
    }

    let cookieHeader = ''
    if (sessionCookie) {
        cookieHeader = `${sessionCookie.name}=${sessionCookie.value}`
    } else {
        console.log('⚠️ Background: No auth cookie found')
        // Send all cookies just in case
        cookieHeader = allCookies.map(c => `${c.name}=${c.value}`).join('; ')
        console.log('🔄 Background: Sending all cookies as fallback')
    }

    const response = await fetch(`${ADBOARD_URL}/api/v1/boards`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Cookie': cookieHeader,
        }
    })

    if (!response.ok) {
        const errorText = await response.text()
        console.error('🚨 Background: Load boards failed:', response.status, errorText)
        throw new Error(`Failed to load boards: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('🎯 Background: Loaded boards:', data.boards?.length || 0)
    return data
}

async function saveAd({ boardIds, pageId, tags, adData }) {
    console.log('🎯 Background: Saving ad to boards:', boardIds)
    console.log('🎯 Background: Ad data:', adData)

    // Get ALL cookies and find session cookie
    const allCookies = await chrome.cookies.getAll({ url: ADBOARD_URL })
    const possibleNames = [
        'next-auth.session-token',
        '__Secure-next-auth.session-token',
        'authjs.session-token',
        '__Secure-authjs.session-token'
    ]

    let sessionCookie = null
    for (const name of possibleNames) {
        const cookies = await chrome.cookies.getAll({ url: ADBOARD_URL, name })
        if (cookies.length > 0) {
            sessionCookie = cookies[0]
            break
        }
    }

    let cookieHeader = ''
    if (sessionCookie) {
        cookieHeader = `${sessionCookie.name}=${sessionCookie.value}`
    } else {
        // Send all cookies as fallback
        cookieHeader = allCookies.map(c => `${c.name}=${c.value}`).join('; ')
    }

    const response = await fetch(`${ADBOARD_URL}/api/v1/assets/fb`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Cookie': cookieHeader,
        },
        body: JSON.stringify({
            boardIds,
            pageId,
            tags,
            adData
        })
    })

    if (!response.ok) {
        const errorText = await response.text()
        console.error('🚨 Background: Save ad failed:', response.status, errorText)
        throw new Error(`Failed to save ad: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('🎯 Background: Ad saved successfully')
    return data
}

// Handle extension icon click to open dashboard
chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.create({ url: `${ADBOARD_URL}/dashboard` })
})
