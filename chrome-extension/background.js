// AdBoard Extension Background Script
const ADBOARD_URL = 'http://localhost:3000' // Change for production

// Global cache for boards and session status
let boardsCache = []
let sessionValid = false
let lastBoardsFetch = 0
let lastSessionCheck = 0
let isExtensionReady = false

// Cache durations (in milliseconds)
const BOARDS_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const SESSION_CACHE_DURATION = 1 * 60 * 1000 // 1 minute

// Pre-load data on extension startup
chrome.runtime.onStartup.addListener(() => {
    console.log('🚀 AdBoard: Extension starting up...')
    console.log('🔍 AdBoard: isExtensionReady before setting:', isExtensionReady)
    // Mark as ready immediately for basic operations like PING
    isExtensionReady = true
    console.log('🔍 AdBoard: isExtensionReady after setting:', isExtensionReady)
    preloadData()
})

chrome.runtime.onInstalled.addListener(() => {
    console.log('🚀 AdBoard: Extension installed...')
    console.log('🔍 AdBoard: isExtensionReady before setting:', isExtensionReady)
    // Mark as ready immediately for basic operations like PING
    isExtensionReady = true
    console.log('🔍 AdBoard: isExtensionReady after setting:', isExtensionReady)
    preloadData()
})

async function preloadData() {
    console.log('🚀 AdBoard: Pre-loading data...')
    try {
        console.log('🔍 AdBoard: Step 1 - Checking session validity...')
        const sessionResult = await checkSessionValidity()
        console.log('🔍 AdBoard: Session validity result:', sessionResult)

        console.log('🔍 AdBoard: Step 2 - Loading boards from API...')
        const boardsResult = await loadBoardsFromAPI()
        console.log('🔍 AdBoard: Boards loading result:', boardsResult?.length || 0, 'boards')

        console.log('✅ AdBoard: Pre-loading completed successfully')
        isExtensionReady = true
        console.log('✅ AdBoard: isExtensionReady set to:', isExtensionReady)
    } catch (error) {
        console.error('❌ AdBoard: Pre-loading failed:', error)
        console.error('❌ AdBoard: Error stack:', error.stack)
        // Still mark as ready even if preloading fails
        isExtensionReady = true
        console.log('✅ AdBoard: isExtensionReady set to true despite error:', isExtensionReady)
    }
}

async function checkSessionValidity() {
    const now = Date.now()

    // Use cached result if still valid
    if (now - lastSessionCheck < SESSION_CACHE_DURATION) {
        console.log('📋 AdBoard: Using cached session status:', sessionValid)
        return sessionValid
    }

    try {
        console.log('🔍 AdBoard: Checking session validity...')

        // Get session cookie using the working approach
        const sessionCookie = await getSessionCookie()

        if (!sessionCookie) {
            console.log('❌ AdBoard: No session cookie found')
            sessionValid = false
            lastSessionCheck = now
            return false
        }

        console.log('🍪 AdBoard: Session cookie found:', sessionCookie.name)

        // Test the session by calling the health endpoint
        const response = await fetch(`${ADBOARD_URL}/api/health`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        })

        if (response.ok) {
            const healthData = await response.json()
            console.log('🏥 AdBoard: Health check response:', healthData)

            // Check if session is valid
            if (healthData.session === 'valid') {
                console.log('✅ AdBoard: Session is valid')
                sessionValid = true
            } else {
                console.log('❌ AdBoard: Session is invalid')
                sessionValid = false
            }
        } else {
            console.log('❌ AdBoard: Health check failed:', response.status)
            sessionValid = false
        }

        lastSessionCheck = now
        return sessionValid

    } catch (error) {
        console.error('❌ AdBoard: Error checking session validity:', error)
        sessionValid = false
        lastSessionCheck = now
        return false
    }
}

async function getSessionCookie() {
    console.log('🔍 AdBoard: Searching for session cookies...')

    try {
        // Use the working approach: individual get() calls instead of getAll()
        const possibleNames = [
            'authjs.session-token',
            'next-auth.session-token',
            '__Host-authjs.csrf-token',
            'authjs.csrf-token'
        ]

        // Try each cookie name individually using the working get() method
        for (const name of possibleNames) {
            try {
                const cookie = await new Promise((resolve) => {
                    chrome.cookies.get(
                        { url: ADBOARD_URL, name: name },
                        (cookie) => resolve(cookie)
                    )
                })

                if (cookie) {
                    console.log(`✅ AdBoard: Found session cookie: ${name}`)
                    return cookie
                }
            } catch (error) {
                console.log(`⚠️ AdBoard: Error getting cookie ${name}:`, error.message)
            }
        }

        console.log('❌ AdBoard: No session cookies found')
        return null

    } catch (error) {
        console.error('❌ AdBoard: Error accessing cookies:', error)
        return null
    }
}

async function loadBoardsFromAPI() {
    const now = Date.now()

    // Use cached boards if still valid
    if (now - lastBoardsFetch < BOARDS_CACHE_DURATION && boardsCache.length > 0) {
        console.log('📋 AdBoard: Using cached boards:', boardsCache.length)
        return boardsCache
    }

    try {
        console.log('📋 AdBoard: Loading boards from API...')

        // Check session first
        const isValid = await checkSessionValidity()
        if (!isValid) {
            console.log('❌ AdBoard: Session invalid, cannot load boards')
            return []
        }

        const response = await fetch(`${ADBOARD_URL}/api/v1/boards`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        })

        if (response.ok) {
            const boards = await response.json()
            console.log('✅ AdBoard: Boards API response:', boards)
            console.log('✅ AdBoard: Boards type:', typeof boards)
            console.log('✅ AdBoard: Boards length:', boards?.length)
            console.log('✅ AdBoard: Boards is array:', Array.isArray(boards))

            // Handle different response structures
            let boardsArray = boards
            if (boards && boards.data && Array.isArray(boards.data)) {
                boardsArray = boards.data
            } else if (boards && boards.boards && Array.isArray(boards.boards)) {
                boardsArray = boards.boards
            } else if (Array.isArray(boards)) {
                boardsArray = boards
            } else {
                console.warn('⚠️ AdBoard: Unexpected boards response structure:', boards)
                boardsArray = []
            }

            console.log('✅ AdBoard: Final boards array:', boardsArray)
            boardsCache = boardsArray
            lastBoardsFetch = now
            return boardsArray
        } else if (response.status === 401) {
            console.log('❌ AdBoard: Session expired, clearing cache')
            sessionValid = false
            boardsCache = []
            return []
        } else {
            console.error('❌ AdBoard: Failed to load boards:', response.status)
            return []
        }

    } catch (error) {
        console.error('❌ AdBoard: Error loading boards:', error)
        return []
    }
}

async function saveAd(adData) {
    try {
        console.log('💾 AdBoard: Saving ad...', adData)

        // Check session first
        const isValid = await checkSessionValidity()
        if (!isValid) {
            throw new Error('Session expired. Please log in to AdBoard.')
        }

        const response = await fetch(`${ADBOARD_URL}/api/v1/assets/fb`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(adData)
        })

        if (response.ok) {
            const result = await response.json()
            console.log('✅ AdBoard: Ad saved successfully:', result)
            return result
        } else if (response.status === 401) {
            sessionValid = false
            throw new Error('Session expired. Please log in to AdBoard.')
        } else {
            const errorData = await response.json()
            throw new Error(errorData.message || 'Failed to save ad')
        }

    } catch (error) {
        console.error('❌ AdBoard: Error saving ad:', error)
        throw error
    }
}

function openDashboard() {
    chrome.tabs.create({ url: `${ADBOARD_URL}/dashboard` })
}

// Message listener for communication with content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        console.log('🎯 Background: Received message:', request.type, 'from tab:', sender.tab?.id)
        console.log('🔍 Background: isExtensionReady state:', isExtensionReady)
        console.log('🔍 Background: Extension ready check:', request.type !== 'PING' && !isExtensionReady)

        // Check if extension is ready (except for PING)
        if (request.type !== 'PING' && !isExtensionReady) {
            console.log('⚠️ Background: Extension not ready yet, rejecting message:', request.type)
            console.log('⚠️ Background: isExtensionReady value:', isExtensionReady)
            sendResponse({ success: false, error: 'Extension not ready yet' })
            return false
        }

        if (request.type === 'LOAD_BOARDS') {
            console.log('🎯 Background: Processing LOAD_BOARDS request')
            handleLoadBoards()
                .then(response => {
                    console.log('🎯 Background: LOAD_BOARDS success, sending response')
                    sendResponse({ success: true, data: { boards: response } })
                })
                .catch(error => {
                    console.error('🚨 Background: LOAD_BOARDS error:', error)
                    // Don't send error details that might cause "Failed to fetch"
                    sendResponse({ success: false, error: 'Failed to load boards' })
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
                    // Don't send error details that might cause "Failed to fetch"
                    sendResponse({ success: false, error: 'Failed to save ad' })
                })
            return true // Will respond asynchronously
        }

        if (request.type === 'CHECK_SESSION') {
            console.log('🎯 Background: Processing CHECK_SESSION request')
            checkSessionValidity()
                .then(isValid => {
                    console.log('🎯 Background: CHECK_SESSION success, sending response')
                    sendResponse({ success: true, data: { isValid } })
                })
                .catch(error => {
                    console.error('🚨 Background: CHECK_SESSION error:', error)
                    // Don't send error details that might cause "Failed to fetch"
                    sendResponse({ success: false, error: 'Session check failed' })
                })
            return true // Will respond asynchronously
        }

        if (request.type === 'PING') {
            console.log('🎯 Background: Processing PING request')
            // Simple ping response to check if extension is ready
            // Also use this opportunity to mark extension as ready if it's not
            if (!isExtensionReady) {
                console.log('🔧 Background: PING received but extension not ready, setting as ready now')
                isExtensionReady = true
            }
            sendResponse({ success: true, data: { message: 'pong', timestamp: Date.now() } })
            return false // Synchronous response
        }

        console.log('⚠️ Background: Unknown message type:', request.type)
        sendResponse({ success: false, error: 'Unknown message type' })

    } catch (error) {
        console.error('🚨 Background: Error processing message:', error)
        // Don't send error details that might cause "Failed to fetch"
        sendResponse({ success: false, error: 'Internal error' })
    }
})

async function handleLoadBoards() {
    // Use cached boards if available
    if (boardsCache.length > 0 && Date.now() - lastBoardsFetch < BOARDS_CACHE_DURATION) {
        console.log('📋 AdBoard: Using cached boards')
        return boardsCache
    }

    // Load from API
    return await loadBoardsFromAPI()
}
