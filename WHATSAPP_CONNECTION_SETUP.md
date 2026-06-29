# WhatsApp Connection UI Setup

## Overview

This secure UI allows business clients to connect their WhatsApp to your Evolution API instance (`client1`) without accessing Evolution Manager directly.

## Files Created

### Backend API Routes
- `app/api/whatsapp/client1/status/route.ts` - Fetches connection status
- `app/api/whatsapp/client1/qr/route.ts` - Generates QR code

### Frontend
- `app/connect-whatsapp/page.tsx` - Main connection UI page

## Environment Variables

Add these to your `.env.local` file:

```bash
EVOLUTION_BASE_URL="https://rafproj1-api.sitesv2.alburujits.com"
EVOLUTION_API_KEY="YOUR_EVOLUTION_API_KEY_HERE"
```

**Important:** Replace `YOUR_EVOLUTION_API_KEY_HERE` with your actual Evolution API key.

## Evolution API Endpoints Used

### 1. Connection Status
```
GET {EVOLUTION_BASE_URL}/instance/connectionState/client1
Headers:
  apikey: {EVOLUTION_API_KEY}
  Content-Type: application/json

Response:
{
  "instance": {
    "instanceName": "client1",
    "state": "open" | "close" | "connecting"
  },
  "connectionStatus": "open" | "close",
  "ownerJid": "919025400934@s.whatsapp.net",
  "profileName": "Asys Tvl"
}
```

### 2. Generate QR Code
```
GET {EVOLUTION_BASE_URL}/instance/connect/client1
Headers:
  apikey: {EVOLUTION_API_KEY}
  Content-Type: application/json

Response:
{
  "base64": "data:image/png;base64,...",
  "pairingCode": "XXXX-XXXX" (optional)
}
```

## Features

### Security
- ✅ JWT/session-based authentication (uses existing `verifySession()`)
- ✅ API key stored securely in environment variables
- ✅ No direct Evolution Manager access for clients
- ✅ All Evolution API calls proxied through secure backend

### UI/UX
- ✅ Real-time connection status display
- ✅ QR code generation with clear instructions
- ✅ Auto-polling every 5 seconds when QR is visible
- ✅ Success state with device name and phone number
- ✅ Responsive design with Tailwind CSS
- ✅ Error handling with user-friendly messages
- ✅ Loading states for all async operations

### Workflow
1. **Page Load** → Check if already connected
2. **If Disconnected** → Show "Generate QR Code" button
3. **On Button Click** → Fetch QR from Evolution API
4. **Display QR** → Show scanning instructions
5. **Poll Status** → Check every 5 seconds
6. **On Connected** → Show success message with device info

## Usage

### For Developers

1. Set environment variables:
```bash
EVOLUTION_API_KEY="your_api_key"
EVOLUTION_BASE_URL="https://rafproj1-api.sitesv2.alburujits.com"
```

2. Start development server:
```bash
npm run dev
```

3. Navigate to: `http://localhost:3000/connect-whatsapp`

### For Clients

1. Log in to the application
2. Navigate to `/connect-whatsapp`
3. Click "Generate QR Code"
4. Scan with WhatsApp mobile app
5. Wait for confirmation

## API Response Types

### Status Response
```typescript
{
  connected: boolean;
  deviceName?: string;      // e.g., "Asys Tvl"
  deviceNumber?: string;    // e.g., "919025400934"
  state?: string;           // "open" | "close" | "connecting"
}
```

### QR Response
```typescript
{
  qr: string;              // data URL or base64
  pairingCode?: string;    // optional pairing code
}
```

## Error Handling

### Backend Errors
- **401 Unauthorized** → Redirects to login
- **500 Server Error** → Shows generic error message
- **Evolution API Failure** → Logs error, returns user-friendly message

### Frontend Errors
- Network failures → "Could not fetch status..."
- QR generation failure → "Could not generate QR code..."
- All errors shown inline with retry options

## Integration with Existing Project

This module integrates seamlessly with your existing:
- ✅ Authentication system (`lib/session.ts`, `lib/auth.ts`)
- ✅ Next.js App Router structure
- ✅ TypeScript configuration
- ✅ Tailwind CSS styling

## Testing

### Test Status Endpoint
```bash
curl -X GET http://localhost:3000/api/whatsapp/client1/status \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

### Test QR Endpoint
```bash
curl -X GET http://localhost:3000/api/whatsapp/client1/qr \
  -H "Cookie: session=YOUR_SESSION_TOKEN"
```

## Troubleshooting

### QR Code Not Generating
- Check `EVOLUTION_API_KEY` is set correctly
- Verify Evolution API is running at the base URL
- Check browser console for detailed error logs

### Connection Not Detected
- Ensure polling is active (check Network tab)
- Verify Evolution instance `client1` exists
- Check Evolution API returns correct status format

### Authentication Issues
- Ensure user is logged in
- Check session cookie is present
- Verify `verifySession()` is working

## Evolution API Documentation

For more details on Evolution API endpoints, refer to:
- Evolution API Swagger docs (typically at `{BASE_URL}/docs`)
- Instance management endpoints
- WebSocket events for real-time updates

## Next Steps

To enhance this module:
1. Add disconnect functionality
2. Show connected device list
3. Add webhook listener for connection events
4. Implement reconnection logic
5. Add connection health monitoring

## Support

For issues or questions:
- Check Evolution API logs
- Verify environment configuration
- Review browser console errors
- Contact technical support
