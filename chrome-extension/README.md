# AdBoard Chrome Extension

A Chrome extension that allows users to save Facebook ads directly from the Facebook Ads Library to their AdBoard collections.

## Features

- 🎯 **Auto-detection**: Automatically detects ads on Facebook Ads Library pages
- 💾 **Quick Save**: Save ads to a specific board with one click
- 📋 **Multi-board Save**: Save ads to multiple boards simultaneously  
- 🔄 **Dynamic Loading**: Works with infinite scroll and dynamically loaded content
- 🎨 **Clean UI**: Unobtrusive buttons that don't interfere with browsing

## Installation

1. **For Development:**
   ```bash
   # Navigate to chrome://extensions/
   # Enable "Developer mode"
   # Click "Load unpacked" and select the chrome-extension folder
   ```

2. **For Production:**
   - Package the extension and upload to Chrome Web Store
   - Update `ADBOARD_URL` in `background.js` to production URL

## How It Works

### On Facebook Ads Library Pages

The extension automatically:
1. Scans the page for ad containers
2. Injects save buttons into each detected ad
3. Provides two saving options:
   - **Save Button**: Quick save to a single board
   - **Multi-Save Button**: Save to multiple boards at once

### Data Extraction

For each ad, the extension extracts:
- Brand name
- Ad headline
- Ad text/copy
- Call-to-action (CTA)
- Media URLs (images/videos)
- Facebook ad ID
- Page ID (if available)

### Authentication

The extension uses your existing AdBoard session cookies to authenticate API requests.

## Technical Details

### Files Structure

```
chrome-extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for API communication
├── content.js            # Main content script
├── content.css           # Styling for injected elements
├── popup.html            # Extension popup (optional)
├── popup.js              # Popup functionality
└── icons/                # Extension icons
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

### Permissions

- `activeTab`: Access current tab content
- `storage`: Store extension settings
- `scripting`: Inject scripts into pages
- `cookies`: Access session cookies for authentication

### Host Permissions

- `https://www.facebook.com/*`: Facebook Ads Library access
- `http://localhost:3000/*`: Development API access
- `https://your-adboard-domain.com/*`: Production API access

## Configuration

### Development Setup

1. Ensure your AdBoard app is running on `http://localhost:3000`
2. Make sure you're logged into AdBoard in the same browser
3. Load the extension in Chrome Developer mode

### Production Setup

1. Update `ADBOARD_URL` in `background.js`:
   ```javascript
   const ADBOARD_URL = 'https://your-production-domain.com'
   ```

2. Update host permissions in `manifest.json`:
   ```json
   "host_permissions": [
       "https://www.facebook.com/*",
       "https://your-production-domain.com/*"
   ]
   ```

## Troubleshooting

### Extension Not Working

1. **Check Console**: Open DevTools and check for errors
2. **Verify Login**: Ensure you're logged into AdBoard
3. **Refresh Page**: Try refreshing the Facebook Ads Library page
4. **Clear Cache**: Clear browser cache and cookies if needed

### No Ads Detected

1. **Page Structure**: Facebook frequently changes their HTML structure
2. **Ad Content**: Ensure the page actually contains ads
3. **Selector Updates**: May need to update ad detection selectors

### API Errors

1. **CORS Issues**: Verify host permissions include your domain
2. **Authentication**: Check if session cookies are being sent
3. **Network**: Verify API endpoints are accessible

## Development

### Testing Changes

1. Make changes to the extension files
2. Go to `chrome://extensions/`
3. Click the refresh button for AdBoard extension
4. Refresh the Facebook Ads Library page
5. Check browser console for debugging info

### Adding New Selectors

If Facebook changes their HTML structure, update the selectors in `content.js`:

```javascript
const adCardSelectors = [
    // Add new selectors here
    'div[data-new-facebook-selector]',
    // Keep existing ones as fallbacks
    '[role="article"]',
    // ...
]
```

### Debugging

The extension logs detailed information to the console:
- 🎯 General operations
- 🔍 Ad detection
- ✅ Successful operations  
- ❌ Errors
- 🚨 Critical issues

## Security

- Extension only runs on Facebook Ads Library pages
- Uses existing session authentication
- No sensitive data stored locally
- All API communication over HTTPS (in production)

## Browser Support

- Chrome 88+ (Manifest V3 support)
- Edge 88+ (Chromium-based)
- Other Chromium-based browsers

## License

[Add your license here]