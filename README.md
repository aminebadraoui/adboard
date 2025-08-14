# AdBoard - Facebook Ads Manager

A web SaaS application for capturing, organizing, and sharing Facebook ads for creative inspiration.

## Features

- 🎯 **Save Facebook Ads**: Add ads from Facebook Ad Library URLs or via Chrome extension
- 📋 **Organize with Boards**: Create custom boards to categorize your ad collection
- 🏷️ **Tag System**: Tag ads for easy filtering and search
- 🔍 **Search & Filter**: Find ads by brand, keyword, or tag
- 🎨 **Brief Builder**: Create creative briefs using saved ads as examples
- 👥 **Team Sharing**: Share ad collections with team members
- ☁️ **Cloud Storage**: All media stored and optimized via Cloudinary

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js with magic link (email)
- **Storage**: Cloudinary for media processing and CDN
- **Scraping**: Cheerio for Facebook ad metadata extraction

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <your-repo>
cd adboard
npm install
```

### 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

Required environment variables:

- **DATABASE_URL**: PostgreSQL connection string
- **NEXTAUTH_SECRET**: Random secret for NextAuth.js
- **EMAIL_***: SMTP settings for magic link emails
- **CLOUDINARY_***: Cloudinary account credentials
- **EXTENSION_API_SECRET**: Secret for Chrome extension authentication

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push database schema (for development)
npm run db:push

# Or run migrations (for production)
npm run db:migrate
```

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Quick Deployment with Coolify

Coolify makes deployment extremely simple:

1. **Connect Repository**: Link your GitHub/GitLab repository to Coolify
2. **Auto-Detection**: Coolify automatically detects this as a Next.js application
3. **Set Environment Variables**: Configure your Supabase and other environment variables
4. **Deploy**: Coolify handles the build and deployment automatically
5. **SSL & Domain**: Configure your domain and enable automatic SSL

No Dockerfile or complex configuration needed!

## API Endpoints

### Asset Ingestion

- `POST /api/v1/assets/fb` - Add Facebook ad (web app)
- `POST /api/v1/ext/assets/fb` - Add Facebook ad (Chrome extension)

### Asset Search

- `GET /api/v1/assets` - Search and filter ads

### Authentication

- Magic link authentication via NextAuth.js
- Personal access tokens for Chrome extension

## Usage

### Adding Ads

1. **Via Web App**: Click "Add Ad" and paste a Facebook Ad Library URL
2. **Via Extension**: Install the Chrome extension and click the save button on any Facebook ad

### Facebook URL Formats Supported

- Ad Library: `https://www.facebook.com/ads/library/?id=123456789`
- Facebook posts with ads
- Any Facebook URL containing ad data

### Organization

- **Boards**: Create themed collections (e.g., "E-commerce", "SaaS", "Q4 Campaign")
- **Tags**: Add descriptive tags for filtering
- **Search**: Full-text search across headlines, brand names, and ad copy

## Chrome Extension

The Chrome extension allows you to save ads directly from Facebook:

1. Install the extension (development instructions below)
2. Generate a personal access token in settings
3. Click the extension icon on any Facebook ad to save it

### Extension Development

```bash
cd extension/
# Build extension files
npm run build
# Load in Chrome developer mode
```

## Deployment

### Database

Set up PostgreSQL using:
- Supabase (recommended for managed database)
- Railway
- PlanetScale
- Any PostgreSQL provider

### Application

Deploy to:
- Coolify (recommended for self-hosting)
- Vercel
- Netlify
- Railway
- Any Docker-compatible hosting

### Environment Variables

Set all production environment variables in your hosting platform.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details.