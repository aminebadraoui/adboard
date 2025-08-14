# Gmail App Password Setup for AdBoard

This guide explains how to set up Gmail App Passwords for sending magic link authentication emails in the AdBoard application.

## Prerequisites

- Gmail account: `adboard80@gmail.com`
- Google Account with 2-Factor Authentication enabled

## Step-by-Step Instructions

### 1. Enable 2-Factor Authentication (if not already enabled)

1. Go to your Google Account settings: https://myaccount.google.com/
2. Click **"Security"** in the left sidebar
3. Under **"Signing in to Google"**, look for **"2-Step Verification"**
4. If it shows "Off", click it and follow the setup process:
   - Verify your phone number
   - Choose your preferred 2FA method (SMS, authenticator app, etc.)
   - Complete the setup

### 2. Generate an App Password

1. Still in the **Security** settings, click **"2-Step Verification"**
2. Scroll down to the bottom and click **"App passwords"**
   - You may need to re-enter your Google password
3. In the App passwords section:
   - Under **"Select app"**, choose **"Mail"**
   - Under **"Select device"**, choose **"Other (Custom name)"**
   - Enter **"AdBoard"** as the custom name
4. Click **"Generate"**
5. Google will display a 16-character password like: `abcd efgh ijkl mnop`
6. **Copy this password immediately** - you won't be able to see it again

### 3. Update Environment Variables

1. Open your `.env.local` file in the AdBoard project
2. Find the email configuration section and update the password:

```env
# Email Provider (for magic links)
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="adboard80@gmail.com"
EMAIL_SERVER_PASSWORD="abcd efgh ijkl mnop"  # Replace with your actual 16-character app password
EMAIL_FROM="adboard80@gmail.com"
```

3. Save the file

### 4. Restart the Development Server

```bash
# Stop the current server
pkill -f "next dev"

# Start it again
npm run dev
```

### 5. Test the Email Functionality

1. Go to http://localhost:3000
2. You should be redirected to the sign-in page
3. Enter any email address and click "Send magic link"
4. Check that no email errors appear in the terminal
5. The magic link should be sent to the email address you entered

## Security Notes

- **Never commit the app password to version control** - it's in `.env.local` which is git-ignored
- **Treat app passwords like regular passwords** - keep them secure
- **You can revoke app passwords anytime** by going back to the App passwords section and clicking "Remove"
- **If you suspect the password is compromised**, immediately revoke it and generate a new one

## Troubleshooting

### "Username and Password not accepted" Error

This error means:
1. 2FA is not enabled on the Gmail account
2. You're using the regular Gmail password instead of an app password
3. The app password was typed incorrectly
4. The app password was revoked

**Solution:** Follow steps 1-2 again to ensure 2FA is enabled and generate a fresh app password.

### "Less secure app access" Error

Google has deprecated "less secure app access." You **must** use App Passwords for SMTP authentication.

### App Password Option Not Visible

If you don't see the "App passwords" option:
1. Ensure 2-Factor Authentication is fully enabled and working
2. Try logging out and back into your Google account
3. Sometimes it takes a few minutes for the option to appear after enabling 2FA

## Current Configuration

- **Gmail Account**: adboard80@gmail.com
- **SMTP Server**: smtp.gmail.com
- **Port**: 587 (STARTTLS)
- **Authentication**: App Password (not regular password)

## Related Files

- `.env.local` - Contains the actual app password (not committed to git)
- `src/lib/auth.ts` - NextAuth configuration with email provider
- `env.example` - Template showing required environment variables
