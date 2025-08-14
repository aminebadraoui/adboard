# AdBoard - Facebook Ads SaaS Platform
## Complete Project Documentation

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Problem Statement & Market Need](#problem-statement--market-need)
3. [Solution Overview](#solution-overview)
4. [Technical Architecture](#technical-architecture)
5. [Domain Model & Data Structure](#domain-model--data-structure)
6. [API Design](#api-design)
7. [User Experience & Interface](#user-experience--interface)
8. [Chrome Extension Integration](#chrome-extension-integration)
9. [Security & Authentication](#security--authentication)
10. [Deployment & Infrastructure](#deployment--infrastructure)
11. [Future Roadmap](#future-roadmap)

---

## Executive Summary

**AdBoard** is a comprehensive web SaaS platform designed to revolutionize how marketing teams and creative professionals capture, organize, and share Facebook advertising content. The platform addresses the critical need for systematic ad intelligence gathering and creative inspiration management in the digital marketing ecosystem.

### Key Value Propositions:
- **Effortless Capture**: One-click saving of Facebook ads via Chrome extension
- **Intelligent Organization**: Board-based categorization with tagging and search
- **Team Collaboration**: Secure sharing and collaborative creative briefing
- **Rich Metadata**: Automatic extraction of advertiser info, runtime data, and creative elements
- **Scalable Storage**: Cloud-based media processing and CDN delivery

### Target Market:
- Digital marketing agencies
- In-house marketing teams
- Creative professionals
- Ad intelligence researchers
- Brand strategists

---

## Problem Statement & Market Need

### Current Pain Points:

**1. Manual Ad Collection**
- Marketers screenshot ads manually
- No systematic organization method
- Loss of metadata and context
- Time-intensive process

**2. Limited Intelligence Gathering**
- Difficult to track ad performance over time
- No advertiser profiling capabilities
- Missing runtime and lifecycle data
- Fragmented competitive analysis

**3. Team Collaboration Challenges**
- No centralized ad repository
- Difficulty sharing inspiration across teams
- Inconsistent creative briefing processes
- Version control issues with saved content

**4. Technical Limitations**
- Facebook's walled garden approach
- CORS restrictions on media access
- Complex URL structures and dynamic content
- Rate limiting and access restrictions

### Market Opportunity:
- $200B+ global digital advertising market
- Growing demand for competitive intelligence tools
- Increased focus on creative performance optimization
- Remote team collaboration needs

---

## Solution Overview

### Conceptual Framework:

**AdBoard** operates on three fundamental pillars:

#### 1. Intelligent Capture System
```
Facebook Ecosystem → Chrome Extension → AdBoard Platform
     ↓                      ↓                ↓
   Ad URLs              Detection         Metadata
   Media Files          Extraction        Processing
   Advertiser Data      Authentication    Storage
```

#### 2. Organizational Intelligence
```
Raw Ad Data → Processing → Structured Knowledge
     ↓            ↓             ↓
   Metadata    Classification  Searchable
   Media       Tagging         Organized
   Context     Boarding        Shareable
```

#### 3. Collaborative Workflow
```
Individual Capture → Team Organization → Creative Briefing
       ↓                   ↓                  ↓
   Personal PAT        Shared Boards      Brief Builder
   Extension Auth      Team Access        Reference Ads
   Private Saves       Role Management    Creative Direction
```

### Core Workflows:

#### Workflow 1: Ad Discovery & Capture
1. User browses Facebook (feed or Ad Library)
2. Extension detects sponsored content
3. One-click save with automatic metadata extraction
4. Background processing and media upload
5. Integration into user's board system

#### Workflow 2: Organization & Curation
1. Bulk import and categorization
2. Tag application and board assignment
3. Search and filter across collections
4. Duplicate detection and management
5. Archive and lifecycle management

#### Workflow 3: Team Collaboration
1. Board sharing with role-based access
2. Collaborative tagging and annotation
3. Creative brief generation with reference ads
4. Export and presentation capabilities
5. Audit trail and version control

---

## Technical Architecture

### System Architecture Overview:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Chrome Ext    │    │   Web Client     │    │   Mobile App    │
│   (Content)     │    │   (Next.js)      │    │   (Future)      │
└─────┬───────────┘    └─────┬────────────┘    └─────────────────┘
      │                      │
      │               ┌──────▼──────┐
      └──────────────►│  API Layer  │
                      │ (Next.js     │
                      │  API Routes) │
                      └──────┬──────┘
                             │
              ┌───────────────┼───────────────┐
              │               │               │
        ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
        │ Database  │  │Cloudinary │  │ External  │
        │(PostgreSQL│  │   CDN     │  │ Services  │
        │ + Prisma) │  │           │  │(Email etc)│
        └───────────┘  └───────────┘  └───────────┘
```

### Technology Stack:

#### Frontend Layer
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS for responsive design
- **Components**: Radix UI primitives with custom styling
- **State Management**: React hooks with server state
- **Authentication**: NextAuth.js session management

#### Backend Layer
- **Runtime**: Node.js with Next.js API routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with email magic links
- **File Storage**: Cloudinary for media processing
- **Validation**: Zod schemas for API validation
- **Security**: CORS, rate limiting, input sanitization

#### Browser Extension
- **Platform**: Chrome Extension Manifest V3
- **Architecture**: Content scripts + service worker
- **Detection**: DOM manipulation and Facebook-specific selectors
- **Communication**: Chrome messaging API
- **Storage**: Chrome storage API for configuration

#### Infrastructure
- **Hosting**: Vercel for seamless Next.js deployment
- **Database**: Supabase PostgreSQL (recommended)
- **CDN**: Cloudinary for global media delivery
- **Monitoring**: Built-in Next.js analytics
- **CI/CD**: Git-based deployment workflows

### Data Flow Architecture:

#### 1. Ad Ingestion Flow
```
Facebook URL → Extension/Web → API Validation → URL Processing
     ↓              ↓              ↓              ↓
Metadata Extract → Authentication → Parsing → Database Store
     ↓              ↓              ↓              ↓
Media Download → Cloudinary → CDN URLs → Asset Creation
     ↓              ↓              ↓              ↓
Board Assignment → Tagging → Search Index → User Response
```

#### 2. Search & Discovery Flow
```
User Query → API Endpoint → Database Query → Result Processing
    ↓            ↓             ↓              ↓
Filter Apply → Prisma ORM → Postgres → JSON Response
    ↓            ↓             ↓              ↓
Pagination → Optimization → Indexing → Client Render
```

#### 3. Authentication Flow
```
Magic Link → Email Delivery → Token Validation → Session Creation
    ↓            ↓              ↓                ↓
User Click → NextAuth → Database Session → API Access
    ↓            ↓              ↓                ↓
Extension → PAT Generation → Token Storage → Authenticated Requests
```

---

## Domain Model & Data Structure

### Entity Relationship Overview:

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│    User     │    │ Organization │    │   Board     │
│             │◄──►│              │◄──►│             │
│ - id        │    │ - id         │    │ - id        │
│ - email     │    │ - name       │    │ - name      │
│ - name      │    │ - slug       │    │ - description│
└─────┬───────┘    └──────┬───────┘    └─────┬───────┘
      │                   │                  │
      │                   │                  │
      ▼                   ▼                  ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ AccessToken │    │ Membership   │    │ BoardAsset  │
│             │    │              │    │             │
│ - token     │    │ - role       │    │ - order     │
│ - name      │    │ - userId     │    │ - addedAt   │
│ - expiresAt │    │ - orgId      │    └─────┬───────┘
└─────────────┘    └──────────────┘          │
                                             │
      ┌──────────────────────────────────────┘
      │
      ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│    Asset    │◄──►│   AssetTag   │◄──►│     Tag     │
│             │    │              │    │             │
│ - fbAdId    │    │ - assetId    │    │ - name      │
│ - headline  │    │ - tagId      │    │ - color     │
│ - brandName │    └──────────────┘    │ - orgId     │
│ - adText    │                        └─────────────┘
│ - media     │
│ - runtime   │
└─────┬───────┘
      │
      ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ AssetFile   │    │  ShareLink   │    │ AuditLog    │
│             │    │              │    │             │
│ - url       │    │ - token      │    │ - action    │
│ - type      │    │ - expiresAt  │    │ - resource  │
│ - cloudId   │    │ - assetId    │    │ - metadata  │
└─────────────┘    └──────────────┘    └─────────────┘
```

### Core Entities:

#### 1. User Management
```typescript
User {
  id: string (cuid)
  email: string (unique)
  name?: string
  emailVerified?: Date
  image?: string
  createdAt: Date
  updatedAt: Date
}

Organization {
  id: string (cuid)
  name: string
  slug: string (unique)
  createdAt: Date
  updatedAt: Date
}

Membership {
  userId: string
  orgId: string
  role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER'
}
```

#### 2. Content Organization
```typescript
Board {
  id: string (cuid)
  name: string
  description?: string
  color?: string
  isDefault: boolean
  orgId: string
  createdAt: Date
  updatedAt: Date
}

Tag {
  id: string (cuid)
  name: string
  color?: string
  orgId: string
}
```

#### 3. Asset Management
```typescript
Asset {
  id: string (cuid)
  platform: 'facebook'
  fbAdId: string
  fbPageId?: string
  adUrl: string
  headline?: string
  cta?: string
  brandName?: string
  adText?: string
  description?: string
  firstSeenDate?: Date
  lastSeenDate?: Date
  runtimeDays?: number
  notes?: string
  createdById: string
  orgId: string
  createdAt: Date
  updatedAt: Date
}

AssetFile {
  id: string (cuid)
  assetId: string
  type: 'image' | 'video'
  url: string
  cloudinaryId: string
  thumbnailUrl?: string
  width?: number
  height?: number
  fileSize?: number
  duration?: number (for videos)
  order: number
  createdAt: Date
}
```

#### 4. Security & Access
```typescript
AccessToken {
  id: string (cuid)
  name: string
  token: string (unique, hashed)
  userId: string
  lastUsed?: Date
  createdAt: Date
  expiresAt?: Date
}

AuditLog {
  id: string (cuid)
  action: string
  resource: string
  resourceId: string
  userId: string
  orgId: string
  metadata?: JSON
  createdAt: Date
}
```

### Database Considerations:

#### Indexing Strategy:
- **Primary indexes**: All ID fields (automatic)
- **Unique indexes**: User email, org slug, asset fbAdId+orgId
- **Search indexes**: Asset brandName, headline, adText
- **Performance indexes**: Asset createdAt, platform, tags
- **Relationship indexes**: All foreign key relationships

#### Scaling Considerations:
- **Partitioning**: Assets by organization for large deployments
- **Archiving**: Old assets and audit logs rotation
- **Caching**: Frequently accessed boards and user data
- **Replication**: Read replicas for search and analytics

---

## API Design

### RESTful API Architecture:

#### Base URL Structure:
```
/api/v1/{resource}/{action}
```

#### Authentication Methods:
1. **Session-based**: Web application (NextAuth.js)
2. **Token-based**: Chrome extension (Bearer tokens)

### Core API Endpoints:

#### 1. Asset Management
```typescript
// Create Facebook ad asset
POST /api/v1/assets/fb
Body: {
  adUrl: string
  boardId?: string
  tags?: string[]
}
Response: {
  id: string
  fbAdId: string
  brandName?: string
  headline?: string
  cta?: string
  media: MediaFile[]
  boardId?: string
}

// Search and filter assets
GET /api/v1/assets
Query: {
  platform?: 'facebook'
  q?: string           // text search
  tag?: string         // filter by tag
  brandName?: string   // filter by brand
  boardId?: string     // filter by board
  sort?: 'createdAt' | 'firstSeenDate' | 'brandName'
  order?: 'asc' | 'desc'
  limit?: number
  cursor?: string      // pagination
}
Response: {
  assets: Asset[]
  pagination: {
    hasMore: boolean
    nextCursor?: string
    count: number
  }
}
```

#### 2. Extension-Specific Endpoints
```typescript
// Extension asset creation (requires PAT)
POST /api/v1/ext/assets/fb
Headers: { Authorization: 'Bearer {token}' }
Body: {
  adUrl: string
  boardId?: string
  tags?: string[]
  orgId?: string
}
Response: {
  id: string
  fbAdId: string
  brandName?: string
  headline?: string
  status: 'created' | 'existing'
}
```

#### 3. Authentication & Token Management
```typescript
// List user's access tokens
GET /api/v1/tokens
Response: {
  tokens: {
    id: string
    name: string
    lastUsed?: Date
    createdAt: Date
    expiresAt?: Date
  }[]
}

// Create new access token
POST /api/v1/tokens
Body: {
  name: string
  expiresAt?: string
}
Response: {
  id: string
  name: string
  token: string  // Only returned once
  createdAt: Date
  expiresAt?: Date
}

// Delete access token
DELETE /api/v1/tokens/{id}
Response: { message: string }
```

### API Response Standards:

#### Success Responses:
```typescript
// 200 OK - Successful GET/PUT/PATCH
{
  data: T,
  meta?: {
    pagination?: PaginationInfo
    totalCount?: number
  }
}

// 201 Created - Successful POST
{
  data: T,
  message?: string
}
```

#### Error Responses:
```typescript
// 400 Bad Request
{
  error: string,
  details?: ValidationError[]
}

// 401 Unauthorized
{
  error: "Unauthorized" | "Invalid token" | "Token expired"
}

// 403 Forbidden
{
  error: "Access denied",
  resource?: string
}

// 404 Not Found
{
  error: "Resource not found",
  resource: string
}

// 500 Internal Server Error
{
  error: "Internal server error",
  requestId?: string
}
```

### Rate Limiting & Security:

#### Rate Limits:
- **Web users**: 1000 requests/hour
- **Extension users**: 500 requests/hour
- **Asset creation**: 100 requests/hour per user
- **Search queries**: 200 requests/hour per user

#### Security Headers:
```typescript
// CORS configuration
{
  origin: ['https://yourdomain.com', 'chrome-extension://*'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}

// Security headers
{
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000'
}
```

---

## User Experience & Interface

### Design Philosophy:

#### 1. Simplicity First
- **One-click actions**: Save, organize, share
- **Progressive disclosure**: Advanced features when needed
- **Familiar patterns**: Standard web conventions
- **Visual hierarchy**: Clear information architecture

#### 2. Performance Oriented
- **Fast loading**: Optimized images and lazy loading
- **Responsive design**: Mobile-first approach
- **Real-time feedback**: Immediate action confirmation
- **Offline capabilities**: Local storage for extension

#### 3. Collaborative by Design
- **Team awareness**: Multi-user indicators
- **Permission clarity**: Role-based UI elements
- **Communication tools**: Comments and annotations
- **Version control**: Change tracking and history

### User Interface Architecture:

#### 1. Dashboard Layout
```
┌─────────────────────────────────────────────────────┐
│ Header: Logo | Search | Add Ad | User Menu          │
├─────────────┬───────────────────────────────────────┤
│ Sidebar:    │ Main Content Area:                    │
│ - Dashboard │ ┌─────────────────────────────────┐   │
│ - All Ads   │ │ Stats Cards                     │   │
│ - Tags      │ │ ┌─────┬─────┬─────┬─────────┐   │   │
│ - Shared    │ │ │Total│Board│Month│Top Brand│   │   │
│ - Briefs    │ │ └─────┴─────┴─────┴─────────┘   │   │
│ ────────────│ └─────────────────────────────────┘   │
│ Boards:     │ ┌─────────────────────────────────┐   │
│ - Board 1   │ │ Recent Ads Grid                 │   │
│ - Board 2   │ │ ┌───┬───┬───┬───┐ ┌───┬───┬───┐ │   │
│ - Board 3   │ │ │Ad │Ad │Ad │Ad │ │Ad │Ad │Ad │ │   │
│ ────────────│ │ └───┴───┴───┴───┘ └───┴───┴───┘ │   │
│ Quick:      │ │ ┌───┬───┬───┬───┐               │   │
│ - Add URL   │ │ │Ad │Ad │Ad │Ad │               │   │
│ - Extension │ │ └───┴───┴───┴───┘               │   │
│ - Settings  │ └─────────────────────────────────┘   │
└─────────────┴───────────────────────────────────────┘
```

#### 2. Ad Card Design
```typescript
AdCard {
  // Visual hierarchy
  Media: AspectRatio(1:1) {
    Image | Video
    PlayButton (if video)
    MediaCount (if carousel)
  }
  
  Content: {
    BrandName: Typography.semibold
    Headline: Typography.medium (truncated)
    AdText: Typography.small.muted (truncated)
    
    Tags: Flex {
      Tag.small (max 3 visible)
      OverflowIndicator (+N more)
    }
    
    Metadata: Flex.between {
      CreatedDate: Typography.xs.muted
      Platform: Typography.xs.muted
    }
  }
  
  Actions: Hover {
    QuickActions: [Share, Edit, Delete]
  }
}
```

#### 3. Search & Filter Interface
```typescript
SearchInterface {
  GlobalSearch: {
    Input: FullWidth.sticky
    Filters: Collapsible {
      Platform: Select
      Brand: Autocomplete
      Tags: MultiSelect
      DateRange: Calendar
      Runtime: Slider
    }
    SortOptions: Dropdown
  }
  
  Results: {
    ResultsCount: Typography.muted
    ViewToggle: [Grid, List]
    Grid: ResponsiveGrid(1-4 columns)
    Pagination: InfiniteScroll | Traditional
  }
}
```

### Responsive Design Strategy:

#### Breakpoint System:
```css
/* Mobile First */
.container {
  /* xs: 0px - 639px */
  padding: 1rem;
  
  /* sm: 640px+ */
  @media (min-width: 640px) {
    padding: 1.5rem;
  }
  
  /* md: 768px+ */
  @media (min-width: 768px) {
    padding: 2rem;
    display: grid;
    grid-template-columns: 256px 1fr;
  }
  
  /* lg: 1024px+ */
  @media (min-width: 1024px) {
    grid-template-columns: 280px 1fr;
    gap: 2rem;
  }
  
  /* xl: 1280px+ */
  @media (min-width: 1280px) {
    max-width: 1280px;
    margin: 0 auto;
  }
}
```

#### Mobile Adaptations:
- **Navigation**: Collapsible sidebar with overlay
- **Search**: Expandable search bar
- **Grid**: Single column on mobile, responsive scaling
- **Forms**: Stack form fields vertically
- **Actions**: Larger touch targets

---

## Chrome Extension Integration

### Extension Architecture:

#### Manifest V3 Structure:
```json
{
  "manifest_version": 3,
  "permissions": ["activeTab", "storage"],
  "host_permissions": ["https://www.facebook.com/*"],
  "content_scripts": [{
    "matches": ["https://www.facebook.com/*"],
    "js": ["content.js"],
    "css": ["content.css"],
    "run_at": "document_idle"
  }],
  "action": {
    "default_popup": "popup.html"
  },
  "background": {
    "service_worker": "background.js"
  }
}
```

#### Component Responsibilities:

**1. Content Script (content.js)**
```typescript
class FacebookAdDetector {
  // Detect sponsored posts in feed
  scanForAds(): void
  
  // Extract ad URLs and metadata
  extractAdData(element: Element): AdData
  
  // Add save buttons to detected ads
  injectSaveButtons(): void
  
  // Handle save button clicks
  saveAd(adElement: Element): Promise<void>
  
  // Show notifications to user
  showNotification(message: string, type: string): void
  
  // Observe DOM changes for dynamic content
  setupMutationObserver(): void
}
```

**2. Popup Interface (popup.js)**
```typescript
class ExtensionPopup {
  // Load saved configuration
  loadConfig(): Promise<Config>
  
  // Save API credentials
  saveConfig(apiUrl: string, token: string): Promise<void>
  
  // Test API connection
  testConnection(): Promise<boolean>
  
  // Save current page ad
  saveCurrentAd(): Promise<void>
  
  // Open AdBoard dashboard
  openDashboard(): void
}
```

**3. Background Service Worker (background.js)**
```typescript
// Handle extension lifecycle events
chrome.runtime.onInstalled.addListener(callback)

// Manage notifications
chrome.notifications.create(options)

// Handle cross-tab communication
chrome.runtime.onMessage.addListener(callback)
```

### Facebook Integration Strategy:

#### Ad Detection Techniques:
```typescript
// 1. Sponsored post detection
const sponsoredIndicators = [
  '[aria-label*="Sponsored"]',
  'span:contains("Sponsored")',
  '[data-testid*="sponsored"]',
  'a[href*="/ads/"]'
]

// 2. Ad Library page detection
const adLibrarySelectors = [
  '[data-testid="ad_library_ads_container"]',
  '.ad-library-card',
  '[role="article"]'
]

// 3. URL extraction methods
const urlExtractionMethods = [
  'href attribute extraction',
  'click simulation and URL capture',
  'data attribute parsing',
  'structured data extraction'
]
```

#### Metadata Extraction:
```typescript
interface ExtractedAdData {
  // Core identifiers
  fbAdId: string
  fbPageId?: string
  adUrl: string
  
  // Content data
  headline?: string
  adText?: string
  cta?: string
  brandName?: string
  
  // Media information
  imageUrls: string[]
  videoUrls: string[]
  
  // Timing data
  timestamp: Date
  source: 'feed' | 'ad_library'
}
```

### Extension Security Model:

#### API Authentication:
```typescript
// Personal Access Token flow
1. User generates PAT in AdBoard settings
2. Extension stores encrypted token locally
3. All API requests include Bearer token
4. Server validates token and user permissions
5. Rate limiting applied per token
```

#### Data Privacy:
- **Local storage only**: No external analytics
- **Minimal permissions**: Only Facebook domains
- **User consent**: Clear data usage policies
- **Token security**: Encrypted local storage
- **Optional telemetry**: User-controlled error reporting

#### Error Handling:
```typescript
class ExtensionErrorHandler {
  // Network connectivity issues
  handleNetworkError(error: NetworkError): void
  
  // Authentication failures
  handleAuthError(error: AuthError): void
  
  // Facebook layout changes
  handleDetectionError(error: DetectionError): void
  
  // API rate limiting
  handleRateLimit(error: RateLimitError): void
  
  // User notification system
  notifyUser(message: string, action?: string): void
}
```

---

## Security & Authentication

### Security Architecture Overview:

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Web Client  │    │ Chrome Ext   │    │ API Server  │
│             │    │              │    │             │
│ Session     │    │ PAT Token    │    │ Auth Layer  │
│ Cookie      │◄──►│ Bearer       │◄──►│ Validation  │
│ NextAuth    │    │ Header       │    │ Middleware  │
└─────────────┘    └──────────────┘    └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Database    │    │ Chrome       │    │ Rate        │
│ Session     │    │ Storage      │    │ Limiting    │
│ Store       │    │ Encrypted    │    │ & Auditing  │
└─────────────┘    └──────────────┘    └─────────────┘
```

### Authentication Mechanisms:

#### 1. Magic Link Authentication (Web)
```typescript
// Flow overview
1. User enters email address
2. System generates secure token
3. Email sent with magic link
4. User clicks link to authenticate
5. Token validated and session created
6. User redirected to dashboard

// Implementation
const magicLinkFlow = {
  generateToken: () => crypto.randomBytes(32).toString('hex'),
  sendEmail: (email: string, token: string) => emailService.send({
    to: email,
    subject: 'Sign in to AdBoard',
    template: 'magic-link',
    data: { token, url: `${baseUrl}/auth/verify?token=${token}` }
  }),
  validateToken: (token: string) => prisma.verificationToken.findUnique({
    where: { token },
    where: { expires: { gt: new Date() } }
  })
}
```

#### 2. Personal Access Token (Extension)
```typescript
// Token generation
const generatePAT = {
  create: () => crypto.randomBytes(32).toString('hex'),
  hash: (token: string) => bcrypt.hash(token, 12),
  validate: (token: string, hash: string) => bcrypt.compare(token, hash)
}

// Token management
interface AccessToken {
  id: string
  name: string          // User-defined label
  hashedToken: string   // Secure storage
  userId: string
  lastUsed?: Date
  expiresAt?: Date
  scopes: string[]      // Future: granular permissions
}
```

#### 3. Organization-Based Access Control
```typescript
enum Role {
  OWNER = 'OWNER',        // Full organization control
  ADMIN = 'ADMIN',        // User and content management
  EDITOR = 'EDITOR',      // Content creation and editing
  VIEWER = 'VIEWER'       // Read-only access
}

const permissions = {
  [Role.OWNER]: ['*'],
  [Role.ADMIN]: ['users.*', 'content.*', 'settings.read'],
  [Role.EDITOR]: ['content.*', 'boards.*'],
  [Role.VIEWER]: ['content.read', 'boards.read']
}
```

### Security Measures:

#### 1. Input Validation & Sanitization
```typescript
// Zod schemas for API validation
const createAssetSchema = z.object({
  adUrl: z.string().url().refine(isValidFacebookUrl),
  boardId: z.string().uuid().optional(),
  tags: z.array(z.string().min(1).max(50)).max(10)
})

// HTML sanitization for user content
const sanitizeUserInput = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
    ALLOWED_ATTR: []
  })
}
```

#### 2. Rate Limiting
```typescript
const rateLimits = {
  global: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 1000                   // requests per window
  },
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 5                      // login attempts
  },
  api: {
    windowMs: 60 * 1000,        // 1 minute
    max: 100                    // API calls per minute
  }
}
```

#### 3. CORS & Security Headers
```typescript
const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "img-src 'self' data: https://res.cloudinary.com",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'"
  ].join('; '),
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
}
```

#### 4. Data Encryption
```typescript
// Environment variables encryption
const encryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyDerivation: 'pbkdf2',
  iterations: 100000,
  saltLength: 32,
  ivLength: 16
}

// Database field encryption for sensitive data
const encryptSensitiveFields = ['accessToken', 'apiKeys', 'personalInfo']
```

### Privacy & Compliance:

#### Data Handling Principles:
1. **Minimal Collection**: Only necessary data collected
2. **Purpose Limitation**: Data used only for stated purposes
3. **Storage Limitation**: Automatic data retention policies
4. **User Control**: Full data export and deletion rights
5. **Transparency**: Clear privacy policy and data usage

#### Compliance Considerations:
- **GDPR**: European user data protection
- **CCPA**: California consumer privacy rights
- **COPPA**: Children's online privacy (if applicable)
- **SOC 2**: Security and availability standards
- **DMCA**: Copyright compliance for scraped content

---

## Deployment & Infrastructure

### Deployment Architecture:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CDN/Edge      │    │   Application    │    │   Database      │
│   (Cloudflare)  │    │   (Coolify)      │    │   (Supabase)    │
│                 │    │                  │    │                 │
│ - Static Assets │    │ - Next.js App    │    │ - PostgreSQL    │
│ - Image Caching │    │ - Auto Deploy   │    │ - Managed DB    │
│ - DDoS Protect  │    │ - Git-based     │    │ - Auto Backups  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌──────────────────┐
                    │   Media Storage  │
                    │   (Cloudinary)   │
                    │                  │
                    │ - Image/Video    │
                    │ - Transformations│
                    │ - Global CDN     │
                    └──────────────────┘
```

### Recommended Infrastructure Stack:

#### 1. Application Hosting - Coolify
```typescript
// Coolify deploys directly from repository - no Dockerfile needed!
// Coolify auto-detects Next.js and handles the build process

// Environment configuration for Coolify
const deploymentConfig = {
  production: {
    type: 'nextjs',                    // Auto-detected by Coolify
    domains: ['adboard.com', 'www.adboard.com'],
    ssl: true,
    healthCheck: '/api/health',
    buildCommand: 'npm run build',     // Auto-detected
    startCommand: 'npm start',         // Auto-detected
    nodeVersion: '18',                 // Specify if needed
    resources: {
      memory: '512MB',
      cpu: '0.5'
    }
  },
  staging: {
    type: 'nextjs',
    domains: ['staging.adboard.com'],
    ssl: true,
    healthCheck: '/api/health',
    buildCommand: 'npm run build',
    startCommand: 'npm start',
    resources: {
      memory: '256MB',
      cpu: '0.25'
    }
  }
}
```

// No additional services needed - just the Next.js application
// Coolify handles everything automatically

```json
// package.json scripts (auto-detected by Coolify)
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate deploy"
  }
}
```

#### 2. Database - Supabase PostgreSQL
```sql
-- Supabase database setup
-- Extensions are automatically available in Supabase
-- Connection pooling is managed by Supabase

-- Enable required extensions (via Supabase dashboard or SQL editor)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Row Level Security policies (optional but recommended)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Example RLS policy for users
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id::uuid);

-- Example RLS policy for organizations
CREATE POLICY "Users can view own organizations" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memberships 
      WHERE memberships.org_id = organizations.id 
      AND memberships.user_id = auth.uid()::text
    )
  );
```

```typescript
// Supabase configuration
const supabaseConfig = {
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  
  // Database connection via Prisma
  databaseUrl: process.env.DATABASE_URL,
  
  // Connection pooling settings
  connectionPooling: {
    enabled: true,
    maxConnections: 20,
    mode: 'transaction' // or 'session'
  },
  
  // Real-time features (optional)
  realtime: {
    enabled: false // Enable if you want real-time updates
  }
}
```

#### 3. Media Storage - Cloudinary
```typescript
// Cloudinary optimization settings
const cloudinaryConfig = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
  
  // Upload settings
  uploadPresets: {
    facebook_ads: {
      folder: 'facebook-ads',
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
        { flags: 'progressive' }
      ]
    }
  },
  
  // Delivery optimization
  deliverySettings: {
    format: 'auto',
    quality: 'auto:good',
    progressive: true,
    responsive: true
  }
}
```

### Scaling Considerations:

#### 1. Application Scaling
```typescript
// Caching strategy
const cachingLayers = {
  // CDN caching for static assets
  static: {
    maxAge: 31536000,  // 1 year
    staleWhileRevalidate: 86400
  },
  
  // API response caching
  api: {
    maxAge: 300,       // 5 minutes
    staleWhileRevalidate: 60
  },
  
  // Database query caching (using Next.js built-in)
  database: {
    nextjsCache: true,
    ttl: 900,          // 15 minutes
    revalidation: 'on-demand'
  }
}

// Auto-scaling configuration for Coolify
const scalingConfig = {
  coolify: {
    replicas: {
      min: 1,
      max: 3,
      targetCPU: 70
    },
    resources: {
      memory: '512Mi',
      cpu: '500m'
    }
  },
  database: {
    supabase: {
      connectionPooling: true,
      maxConnections: 20,
      readReplicas: 'managed_by_supabase'
    }
  },
  
  // No Redis needed - Next.js handles caching well
  caching: {
    strategy: 'nextjs_built_in',
    isr: true,
    staticGeneration: true
  }
}
```

#### 2. Performance Optimization
```typescript
// Bundle optimization
const buildOptimizations = {
  nextjs: {
    swcMinify: true,
    experimental: {
      optimizeCss: true,
      optimizeImages: true
    }
  },
  
  // Code splitting
  dynamicImports: [
    'components/heavy-editor',
    'components/analytics-dashboard',
    'components/export-tools'
  ],
  
  // Image optimization
  images: {
    domains: ['res.cloudinary.com'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 86400
  }
}
```

#### 3. Monitoring & Observability
```typescript
// Application monitoring
const monitoringStack = {
  // Error tracking
  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1
  },
  
  // Performance monitoring
  analytics: {
    enabled: true,
    debug: false,
    provider: 'self-hosted'
  },
  
  // Database monitoring
  prismaMetrics: {
    enabled: true,
    endpoint: '/api/metrics'
  },
  
  // Custom metrics
  customMetrics: [
    'ads_scraped_per_hour',
    'extension_saves_per_day',
    'api_response_times',
    'user_engagement_metrics'
  ]
}
```

### Deployment Pipeline:

#### 1. CI/CD Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production via Coolify

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test
      - run: npm run type-check
      - run: npm run lint

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Coolify
        run: |
          # Coolify webhook for automatic deployment
          curl -X POST "${{ secrets.COOLIFY_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            -d '{"ref": "${{ github.ref }}", "sha": "${{ github.sha }}"}'
```

#### 2. Environment Management
```typescript
// Environment-specific configurations
const environments = {
  development: {
    database: 'localhost:5432/adboard_dev',
    cloudinary: 'dev-account',
    logging: 'debug'
  },
  
  staging: {
    database: 'postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres',
    cloudinary: 'staging-account',
    logging: 'info'
  },
  
  production: {
    database: 'postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres',
    cloudinary: 'prod-account',
    logging: 'warn'
  }
}
```

---

## Future Roadmap

### Phase 1: Core Platform (Completed)
- ✅ Facebook ad scraping and storage
- ✅ Chrome extension development
- ✅ User authentication and organization management
- ✅ Basic search and filtering
- ✅ Board-based organization
- ✅ API token management

### Phase 2: Enhanced Features (3-6 months)
#### Advanced Analytics
```typescript
// Ad performance tracking
interface AdAnalytics {
  impressionEstimates: number
  engagementMetrics: EngagementData
  competitorAnalysis: CompetitorInsights
  trendAnalysis: TrendData
  seasonalPatterns: SeasonalInsights
}

// Dashboard enhancements
const analyticsFeatures = [
  'Ad performance scoring',
  'Competitor tracking',
  'Industry benchmarking',
  'Trend identification',
  'ROI estimation tools'
]
```

#### Enhanced Brief Builder
```typescript
// Creative brief system
interface CreativeBrief {
  id: string
  title: string
  objective: string
  targetAudience: AudienceProfile
  brandGuidelines: BrandGuide
  referenceAds: Asset[]
  deliverables: Deliverable[]
  timeline: ProjectTimeline
  budget?: BudgetInfo
  approvalWorkflow: ApprovalStep[]
}

const briefFeatures = [
  'Template library',
  'Collaborative editing',
  'Approval workflows',
  'Asset integration',
  'Export capabilities'
]
```

### Phase 3: Platform Expansion (6-12 months)
#### Multi-Platform Support
```typescript
// Extended platform coverage
const supportedPlatforms = {
  current: ['facebook'],
  planned: [
    'instagram',
    'google_ads',
    'linkedin',
    'twitter',
    'youtube',
    'tiktok',
    'snapchat'
  ]
}

// Universal ad interface
interface UniversalAd {
  platform: Platform
  platformSpecificId: string
  universalMetadata: StandardMetadata
  platformMetadata: PlatformSpecificData
  crossPlatformInsights: CrossPlatformAnalytics
}
```

#### Enterprise Features
```typescript
// Enterprise capabilities
const enterpriseFeatures = [
  'Single Sign-On (SSO)',
  'Advanced user management',
  'Custom branding',
  'API rate limit increases',
  'Priority support',
  'On-premise deployment',
  'Advanced analytics',
  'Custom integrations'
]

// Pricing tiers
const pricingModel = {
  starter: {
    users: 5,
    ads: 1000,
    boards: 10,
    price: '$29/month'
  },
  professional: {
    users: 25,
    ads: 10000,
    boards: 50,
    price: '$99/month'
  },
  enterprise: {
    users: 'unlimited',
    ads: 'unlimited',
    boards: 'unlimited',
    price: 'custom'
  }
}
```

### Phase 4: AI & Automation (12-18 months)
#### AI-Powered Features
```typescript
// Machine learning capabilities
const aiFeatures = {
  // Content analysis
  adClassification: {
    categories: ['product', 'service', 'brand', 'event'],
    sentiment: ['positive', 'negative', 'neutral'],
    style: ['minimalist', 'bold', 'playful', 'professional']
  },
  
  // Performance prediction
  performancePrediction: {
    engagementScore: number,
    viralityPotential: number,
    brandAlignment: number,
    audienceMatch: number
  },
  
  // Automated insights
  insights: [
    'trending_creative_patterns',
    'competitor_strategy_analysis',
    'seasonal_opportunity_identification',
    'brand_gap_analysis'
  ]
}
```

#### Automation Tools
```typescript
// Automated workflows
const automationCapabilities = {
  // Smart collection
  autoCollection: {
    brandMonitoring: 'Track specific advertiser activity',
    keywordTracking: 'Monitor industry keywords',
    competitorWatching: 'Alert on competitor campaigns'
  },
  
  // Content generation
  contentAssistance: {
    briefGeneration: 'Auto-generate briefs from saved ads',
    tagSuggestions: 'AI-powered tag recommendations',
    organizationHelp: 'Smart board suggestions'
  },
  
  // Reporting automation
  reportGeneration: {
    weeklyDigests: 'Automated trend reports',
    competitorUpdates: 'Competitor activity summaries',
    performanceReports: 'Team performance analytics'
  }
}
```

### Long-term Vision (18+ months)
#### Marketplace & Community
```typescript
// Community features
const communityPlatform = {
  // Content sharing
  publicBoards: 'Share curated collections',
  templates: 'Brief and organization templates',
  insights: 'Community-driven insights',
  
  // Collaboration
  teamFeatures: 'Enhanced team collaboration',
  externalSharing: 'Client presentation tools',
  integrations: 'Third-party tool connections',
  
  // Monetization
  marketplace: 'Premium content and templates',
  consulting: 'Expert advisory services',
  whiteLabel: 'Branded platform solutions'
}
```

#### Advanced Integrations
```typescript
// Integration ecosystem
const integrationsRoadmap = {
  // Design tools
  design: ['figma', 'sketch', 'adobe_creative_suite'],
  
  // Marketing platforms
  marketing: ['hubspot', 'marketo', 'salesforce'],
  
  // Analytics
  analytics: ['google_analytics', 'mixpanel', 'amplitude'],
  
  // Project management
  projectManagement: ['asana', 'monday', 'notion'],
  
  // Communication
  communication: ['slack', 'teams', 'discord']
}
```

---

## Conclusion

**AdBoard** represents a comprehensive solution to the Facebook advertising intelligence and creative inspiration challenge. Built with modern web technologies and a user-centric design philosophy, the platform provides marketers, agencies, and creative professionals with powerful tools to capture, organize, and leverage advertising content for strategic advantage.

### Key Success Metrics:
- **User Adoption**: Active user growth and retention rates
- **Content Volume**: Ads saved and organized per user
- **Team Collaboration**: Multi-user workspace utilization
- **Extension Usage**: Chrome extension installation and usage rates
- **API Adoption**: Third-party integrations and developer engagement

### Competitive Advantages:
1. **Seamless Capture**: Chrome extension eliminates manual screenshot processes
2. **Rich Metadata**: Automatic extraction of advertiser and performance data
3. **Team-First Design**: Built for collaborative marketing workflows
4. **Scalable Architecture**: Modern tech stack supporting rapid growth
5. **Security-Focused**: Enterprise-grade security and privacy protection

### Technical Achievements:
- **Full-Stack TypeScript**: Type-safe development across all components
- **Modern React Architecture**: Leveraging latest Next.js capabilities
- **Robust API Design**: RESTful architecture with comprehensive error handling
- **Security Best Practices**: Multi-layered authentication and authorization
- **Performance Optimization**: CDN delivery and intelligent caching strategies

The platform is positioned for immediate deployment and user acquisition, with a clear roadmap for feature expansion and market growth. The technical foundation supports both rapid iteration and long-term scalability, making AdBoard a strong candidate for success in the competitive marketing intelligence space.

---

*This document serves as both technical specification and strategic overview, providing stakeholders with comprehensive understanding of the AdBoard platform's capabilities, architecture, and future potential.*