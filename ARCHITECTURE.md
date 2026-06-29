# WhatsApp Connection UI - Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT BROWSER                          │
│                                                             │
│  ┌───────────────────────────────────────────────────┐    │
│  │         /connect-whatsapp Page                    │    │
│  │  ┌─────────────────────────────────────────────┐  │    │
│  │  │  Connection Status Display                  │  │    │
│  │  │  - Shows: Connected/Disconnected            │  │    │
│  │  │  - Device name & phone number               │  │    │
│  │  └─────────────────────────────────────────────┘  │    │
│  │  ┌─────────────────────────────────────────────┐  │    │
│  │  │  QR Code Generator                          │  │    │
│  │  │  - "Generate QR" button                     │  │    │
│  │  │  - QR code display <img>                    │  │    │
│  │  │  - Scanning instructions                    │  │    │
│  │  └─────────────────────────────────────────────┘  │    │
│  │  ┌─────────────────────────────────────────────┐  │    │
│  │  │  Auto-Polling (every 5 seconds)             │  │    │
│  │  │  - useEffect + setInterval                  │  │    │
│  │  │  - Stops when connected                     │  │    │
│  │  └─────────────────────────────────────────────┘  │    │
│  └───────────────────────────────────────────────────┘    │
│                                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTPS (with session cookie)
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  NEXT.JS APPLICATION                        │
│              (Your Next.js Backend)                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Middleware (middleware.ts)                         │   │
│  │  - Protects /connect-whatsapp route                 │   │
│  │  - Redirects to /login if no session                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  API Routes                                         │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │ /api/whatsapp/client1/status                  │  │   │
│  │  │  - Calls verifySession()                      │  │   │
│  │  │  - Proxies to Evolution API                   │  │   │
│  │  │  - Returns: { connected, deviceName, ... }    │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │ /api/whatsapp/client1/qr                      │  │   │
│  │  │  - Calls verifySession()                      │  │   │
│  │  │  - Proxies to Evolution API                   │  │   │
│  │  │  - Returns: { qr: "data:image/png;..." }      │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Authentication (lib/session.ts)                    │   │
│  │  - verifySession() checks JWT                       │   │
│  │  - Returns session or null                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTPS (with EVOLUTION_API_KEY header)
                       │
┌──────────────────────▼──────────────────────────────────────┐
│               EVOLUTION API INSTANCE                        │
│          https://rafproj1-api.sitesv2.alburujits.com        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Instance: client1                                  │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │ GET /instance/connectionState/client1         │  │   │
│  │  │  Returns:                                      │  │   │
│  │  │  {                                             │  │   │
│  │  │    instance: { state: "open" },                │  │   │
│  │  │    ownerJid: "919025400934@s.whatsapp.net",    │  │   │
│  │  │    profileName: "Asys Tvl"                     │  │   │
│  │  │  }                                             │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │ GET /instance/connect/client1                 │  │   │
│  │  │  Returns:                                      │  │   │
│  │  │  {                                             │  │   │
│  │  │    base64: "data:image/png;base64,iVB...",     │  │   │
│  │  │    pairingCode: "XXXX-XXXX"                    │  │   │
│  │  │  }                                             │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  WhatsApp Connection State                          │   │
│  │  - Maintains WebSocket to WhatsApp                  │   │
│  │  - Handles QR code generation                       │   │
│  │  - Tracks connection state                          │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ WhatsApp Protocol
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  WHATSAPP SERVERS                           │
│                                                             │
│  - Validates QR code scans                                  │
│  - Establishes connection                                   │
│  - Maintains session                                        │
└─────────────────────────────────────────────────────────────┘
```

## Sequence Diagram: Connection Flow

### Scenario 1: User Arrives, Already Connected

```
Client                Next.js              Evolution API        WhatsApp
  │                      │                       │                │
  │─────GET /connect-whatsapp─────>│             │                │
  │                      │                       │                │
  │<────Verify Session───│                       │                │
  │        (OK)          │                       │                │
  │                      │                       │                │
  │  fetch('/api/.../status')                    │                │
  │─────────────────────>│                       │                │
  │                      │                       │                │
  │                      │─GET connectionState──>│                │
  │                      │    (+ API key)        │                │
  │                      │                       │                │
  │                      │<─state: "open"────────│                │
  │                      │  profileName          │                │
  │                      │  ownerJid             │                │
  │                      │                       │                │
  │<─{ connected: true }─│                       │                │
  │   deviceName         │                       │                │
  │   deviceNumber       │                       │                │
  │                      │                       │                │
  │                      │                       │                │
 [Show Success State]    │                       │                │
 "WhatsApp Connected!"   │                       │                │
 Device: Asys Tvl        │                       │                │
 Phone: 919025400934     │                       │                │
```

### Scenario 2: User Needs to Connect

```
Client                Next.js              Evolution API        WhatsApp
  │                      │                       │                │
  │─────GET /connect-whatsapp─────>│             │                │
  │                      │                       │                │
  │<────Verify Session───│                       │                │
  │        (OK)          │                       │                │
  │                      │                       │                │
  │  fetch('/api/.../status')                    │                │
  │─────────────────────>│                       │                │
  │                      │                       │                │
  │                      │─GET connectionState──>│                │
  │                      │                       │                │
  │                      │<─state: "close"───────│                │
  │                      │                       │                │
  │<─{ connected: false}─│                       │                │
  │                      │                       │                │
  │                      │                       │                │
 [Show "Generate QR" Button]                     │                │
  │                      │                       │                │
 [User clicks button]    │                       │                │
  │                      │                       │                │
  │  fetch('/api/.../qr')│                       │                │
  │─────────────────────>│                       │                │
  │                      │                       │                │
  │                      │─GET connect/client1──>│                │
  │                      │                       │                │
  │                      │                       │──Generate QR───>│
  │                      │                       │                │
  │                      │<─QR base64 data───────│<───QR Code─────│
  │                      │                       │                │
  │<─{ qr: "data:..." }──│                       │                │
  │                      │                       │                │
  │                      │                       │                │
 [Display QR Code]       │                       │                │
 [Start Polling]         │                       │                │
  │                      │                       │                │
  │                      │                       │                │
 [User scans QR]─────────────────────────────────────────────────>│
  │                      │                       │                │
  │                      │                       │<─Authenticate───│
  │                      │                       │                │
  │                      │                       │──Session OK───>│
  │                      │                       │                │
  │                      │                       │   [Connected]  │
  │                      │                       │                │
 [Poll: every 5s]        │                       │                │
  │  fetch('/api/.../status')                    │                │
  │─────────────────────>│                       │                │
  │                      │─GET connectionState──>│                │
  │                      │<─state: "open"────────│                │
  │<─{ connected: true }─│                       │                │
  │                      │                       │                │
 [Show Success State]    │                       │                │
 [Stop Polling]          │                       │                │
```

## Data Flow

### Status Check Flow

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ GET /api/whatsapp/client1/status
       │ Cookie: session=...
       ▼
┌─────────────────────────┐
│  Next.js API Route      │
│  1. verifySession()     │────→ Check JWT ──→ ✅ Valid
│  2. Add EVOLUTION_KEY   │
│  3. Fetch from Evolution│
└──────┬──────────────────┘
       │
       │ GET .../connectionState/client1
       │ Header: apikey: xxx
       ▼
┌─────────────────────────┐
│   Evolution API         │
│  Returns:               │
│  {                      │
│    instance: {          │
│      state: "open"      │
│    },                   │
│    ownerJid: "919...",  │
│    profileName: "..."   │
│  }                      │
└──────┬──────────────────┘
       │
       │ Transform data
       ▼
┌─────────────────────────┐
│  Next.js API Response   │
│  {                      │
│    connected: true,     │
│    deviceName: "...",   │
│    deviceNumber: "...", │
│    state: "open"        │
│  }                      │
└──────┬──────────────────┘
       │
       ▼
┌─────────────┐
│   Browser   │
│  Update UI  │
└─────────────┘
```

## Security Layers

```
┌─────────────────────────────────────────────────┐
│  Layer 1: Client Authentication                 │
│  - Session JWT required                         │
│  - Middleware checks on route access            │
│  - Redirects to /login if invalid               │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│  Layer 2: API Route Protection                  │
│  - verifySession() called in each route         │
│  - Returns 401 if unauthorized                  │
│  - No Evolution API calls without auth          │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│  Layer 3: Environment Variable Protection       │
│  - EVOLUTION_API_KEY in .env.local              │
│  - Never exposed to client                      │
│  - Only accessible in server-side code          │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│  Layer 4: Backend Proxy                         │
│  - Client never calls Evolution API directly    │
│  - All requests proxied through Next.js         │
│  - API key added by backend only                │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│  Layer 5: Evolution API Authentication          │
│  - API key validated by Evolution               │
│  - Rejects invalid/missing keys                 │
│  - Rate limiting (if configured)                │
└─────────────────────────────────────────────────┘
```

## Component Breakdown

### Frontend Component (`app/connect-whatsapp/page.tsx`)

```typescript
ConnectWhatsAppPage
├── State Management
│   ├── status (ConnectionStatus | null)
│   ├── qrCode (string)
│   ├── loading (boolean)
│   ├── error (string)
│   └── polling (boolean)
│
├── Effects
│   ├── useEffect: Initial status fetch
│   └── useEffect: Polling (when QR visible)
│
├── Functions
│   ├── fetchStatus() → GET /api/.../status
│   └── generateQR() → GET /api/.../qr
│
└── Render
    ├── Loading State
    ├── Error Display
    ├── Connected State
    │   ├── Success icon
    │   ├── Device info
    │   └── "Go to Dashboard" button
    ├── Disconnected State
    │   ├── Disconnected icon
    │   └── "Generate QR Code" button
    └── QR Code Display
        ├── QR image
        ├── Instructions (4 steps)
        ├── Polling indicator
        └── Refresh button
```

### Backend Routes

```
app/api/whatsapp/client1/
│
├── status/route.ts
│   └── GET Handler
│       ├── 1. Verify session
│       ├── 2. Check EVOLUTION_API_KEY
│       ├── 3. Fetch from Evolution
│       ├── 4. Transform response
│       └── 5. Return JSON
│
└── qr/route.ts
    └── GET Handler
        ├── 1. Verify session
        ├── 2. Check EVOLUTION_API_KEY
        ├── 3. Fetch QR from Evolution
        ├── 4. Extract base64 data
        └── 5. Return JSON
```

## File Structure

```
project-root/
├── app/
│   ├── api/
│   │   └── whatsapp/
│   │       └── client1/
│   │           ├── status/
│   │           │   └── route.ts        ← Status endpoint
│   │           └── qr/
│   │               └── route.ts        ← QR endpoint
│   ├── connect-whatsapp/
│   │   └── page.tsx                    ← Main UI page
│   └── dashboard/
│       └── page.tsx                    ← Updated with nav link
├── lib/
│   ├── types/
│   │   └── whatsapp.ts                 ← TypeScript types
│   ├── session.ts                      ← Authentication
│   └── auth.ts                         ← Credential verification
├── scripts/
│   └── test-evolution-api.js           ← Test script
├── .env.local                          ← Environment config
├── package.json                        ← Updated with deps
├── README_WHATSAPP_CONNECTION.md       ← Main guide
├── WHATSAPP_CONNECTION_SETUP.md        ← Setup guide
├── EVOLUTION_API_GUIDE.md              ← API reference
├── IMPLEMENTATION_SUMMARY.md           ← Summary
└── ARCHITECTURE.md                     ← This file
```

## Technology Stack

```
┌─────────────────────────────────────┐
│         Frontend Layer              │
│  • React 19                         │
│  • TypeScript                       │
│  • Tailwind CSS                     │
│  • Client-side state management     │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│      Application Layer              │
│  • Next.js 16+ (App Router)         │
│  • Server Components                │
│  • API Routes                       │
│  • Middleware                       │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│      Authentication Layer           │
│  • JWT (via jose library)           │
│  • Session management               │
│  • Cookie-based auth                │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│      Integration Layer              │
│  • Evolution API client             │
│  • Fetch API                        │
│  • Environment config               │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│      External Services              │
│  • Evolution API                    │
│  • WhatsApp Servers                 │
└─────────────────────────────────────┘
```

---

**Document Purpose**: Architectural overview and system design
**Audience**: Developers implementing or maintaining the system
**Related Docs**: See README_WHATSAPP_CONNECTION.md for usage
