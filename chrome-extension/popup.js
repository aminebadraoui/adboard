// AdBoard Extension Popup Script
document.addEventListener('DOMContentLoaded', async () => {
    const statusDiv = document.getElementById('status')
    const statusText = document.getElementById('statusText')
    const refreshBtn = document.getElementById('refreshBtn')
    const refreshText = document.getElementById('refreshText')
    const dashboardBtn = document.getElementById('dashboardBtn')

    // Check current status
    await checkStatus()

    // Set up event listeners
    refreshBtn.addEventListener('click', handleRefresh)
    dashboardBtn.addEventListener('click', handleDashboard)

    async function checkStatus() {
        try {
            setStatus('loading', 'Checking session and boards...')

            // Check session validity
            const sessionResponse = await chrome.runtime.sendMessage({
                type: 'CHECK_SESSION'
            })

            if (sessionResponse?.success) {
                const isValid = sessionResponse.data.isValid

                if (isValid) {
                    // Check if boards are loaded
                    const boardsResponse = await chrome.runtime.sendMessage({
                        type: 'LOAD_BOARDS'
                    })

                    if (boardsResponse?.success && boardsResponse?.data?.boards) {
                        const boardCount = boardsResponse.data.boards.length
                        setStatus('success', `Ready! ${boardCount} board(s) available`)
                        refreshBtn.disabled = false
                        refreshText.textContent = 'Refresh Boards'
                    } else {
                        setStatus('warning', 'Session valid but no boards found')
                        refreshBtn.disabled = false
                        refreshText.textContent = 'Load Boards'
                    }
                } else {
                    setStatus('error', 'Not logged in to AdBoard')
                    refreshBtn.disabled = false
                    refreshText.textContent = 'Check Session'
                }
            } else {
                setStatus('error', 'Failed to check status')
                refreshBtn.disabled = false
                refreshText.textContent = 'Retry'
            }
        } catch (error) {
            console.error('Status check failed:', error)
            setStatus('error', 'Connection error')
            refreshBtn.disabled = false
            refreshText.textContent = 'Retry'
        }
    }

    async function handleRefresh() {
        try {
            setStatus('loading', 'Refreshing...')
            refreshBtn.disabled = true

            // Force refresh of session and boards
            const sessionResponse = await chrome.runtime.sendMessage({
                type: 'CHECK_SESSION'
            })

            if (sessionResponse?.success && sessionResponse?.data?.isValid) {
                const boardsResponse = await chrome.runtime.sendMessage({
                    type: 'LOAD_BOARDS'
                })

                if (boardsResponse?.success && boardsResponse?.data?.boards) {
                    const boardCount = boardsResponse.data.boards.length
                    setStatus('success', `Refreshed! ${boardCount} board(s) available`)
                } else {
                    setStatus('warning', 'Session valid but no boards found')
                }
            } else {
                setStatus('error', 'Session expired. Please log in to AdBoard.')
            }
        } catch (error) {
            console.error('Refresh failed:', error)
            setStatus('error', 'Refresh failed')
        } finally {
            refreshBtn.disabled = false
            refreshText.textContent = 'Refresh'
        }
    }

    function handleDashboard() {
        chrome.tabs.create({ url: 'http://localhost:3000/dashboard' })
    }

    function setStatus(type, message) {
        // Remove all status classes
        statusDiv.className = 'status'

        // Add the appropriate status class
        statusDiv.classList.add(type)

        // Update the message
        statusText.textContent = message
    }
})
