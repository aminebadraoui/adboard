# AdBoard Chrome Extension

A Chrome extension that allows you to save Facebook ads to your AdBoard collections with instant UI and smart caching.

## Features

- **Instant UI Rendering**: Save buttons appear immediately without waiting for API calls
- **Smart Caching**: Session and boards data are cached to minimize API requests
- **Pre-loading**: Data is loaded when the extension starts up, not when you visit pages
- **Session Management**: Automatic session validation and expiration handling
- **Loading States**: Proper loading indicators and error handling throughout the UI

## Performance Optimizations

### 1. Extension-Level Caching
- **Session validation** is checked once when the extension loads
- **Boards data** is cached for 5 minutes to avoid repeated API calls
- **Background refresh** happens every 10 minutes to keep data fresh

### 2. Instant UI Rendering
- Save buttons show immediately with appropriate states:
  - `Loading...` - While extension initializes
  - `Login Required` - When session is invalid
  - `Add to AdBoard` - When ready to use
- No more waiting for API calls when refreshing Facebook pages

### 3. Smart Data Loading
- **Pre-loading**: Session and boards are loaded when extension starts
- **Lazy loading**: Boards are only fetched when needed
- **Error handling**: Graceful fallbacks for network issues

## Installation

1. Clone or download this extension
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `chrome-extension` folder
5. The extension will appear in your toolbar

## Usage

1. **Login to AdBoard**: Visit your AdBoard dashboard and log in
2. **Navigate to Facebook Ad Library**: Go to any Facebook Ad Library page
3. **Save Ads**: Click the "Add to AdBoard" button that appears on each ad
4. **Select Boards**: Choose which boards to save the ad to
5. **Monitor Status**: Click the extension icon to see current status

## Technical Details

### Background Script (`background.js`)
- Handles all API communication with AdBoard
- Manages session validation and caching
- Pre-loads data on extension startup
- Periodically refreshes cached data

### Content Script (`content.js`)
- Detects Facebook ad cards on the page
- Injects save buttons with instant rendering
- Shows appropriate loading states
- Handles user interactions

### Popup (`popup.html` + `popup.js`)
- Shows current extension status
- Allows manual refresh of data
- Provides quick access to dashboard

## API Endpoints Used

- `GET /api/health` - Session validation
- `GET /api/v1/boards` - Fetch user boards
- `POST /api/v1/assets/fb` - Save ads to boards

## Configuration

Update the `ADBOARD_URL` constant in `background.js` for production:
```javascript
const ADBOARD_URL = 'https://your-adboard-domain.com' // Change for production
```

## Troubleshooting

### Extension Not Working
1. Check if you're logged into AdBoard
2. Verify the extension has the correct permissions
3. Check the browser console for error messages

### Session Issues
1. Log out and back into AdBoard
2. Click the extension icon and use "Check Session"
3. Ensure cookies are enabled for your AdBoard domain

### Performance Issues
1. The extension caches data for 5 minutes
2. Use the "Refresh" button in the popup to force reload
3. Check network connectivity to your AdBoard instance

## Development

To modify the extension:
1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the AdBoard extension
4. Test your changes

## Browser Support

- Chrome 88+ (Manifest V3)
- Edge 88+ (Chromium-based)
- Other Chromium-based browsers

## License

This extension is part of the AdBoard project.