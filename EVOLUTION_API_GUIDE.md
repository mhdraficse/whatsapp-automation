# Evolution API Integration Guide

## Quick Start

### 1. Get Your Evolution API Key

Your Evolution API instance is running at:
```
https://rafproj1-api.sitesv2.alburujits.com
```

To get your API key:
1. Access Evolution Manager (if you have access)
2. Navigate to Settings → API Keys
3. Copy your existing API key or create a new one
4. Add it to `.env.local`:

```bash
EVOLUTION_API_KEY="your_actual_key_here"
```

### 2. Verify Instance Name

The code is configured for instance name: **`client1`**

To verify this instance exists:
```bash
curl -X GET https://rafproj1-api.sitesv2.alburujits.com/instance/fetchInstances \
  -H "apikey: YOUR_API_KEY"
```

If `client1` doesn't exist or you need to use a different instance name, update these files:
- `app/api/whatsapp/client1/status/route.ts`
- `app/api/whatsapp/client1/qr/route.ts`
- `app/connect-whatsapp/page.tsx` (update fetch URLs)

### 3. Test the Integration

Start your Next.js app:
```bash
npm run dev
```

Test endpoints manually:

**Check Status:**
```bash
curl http://localhost:3000/api/whatsapp/client1/status \
  -H "Cookie: session=YOUR_SESSION_COOKIE"
```

**Generate QR:**
```bash
curl http://localhost:3000/api/whatsapp/client1/qr \
  -H "Cookie: session=YOUR_SESSION_COOKIE"
```

## Evolution API Endpoints Reference

### Get All Instances
```
GET /instance/fetchInstances
Headers: apikey: YOUR_KEY
```

### Get Connection State
```
GET /instance/connectionState/{instanceName}
Headers: apikey: YOUR_KEY

Response:
{
  "instance": {
    "instanceName": "client1",
    "state": "open"  // or "close", "connecting"
  },
  "ownerJid": "919025400934@s.whatsapp.net",
  "profileName": "Asys Tvl"
}
```

### Connect Instance (Get QR)
```
GET /instance/connect/{instanceName}
Headers: apikey: YOUR_KEY

Response:
{
  "base64": "data:image/png;base64,iVBORw0KGgo...",
  "pairingCode": "ABCD-EFGH"
}
```

### Logout/Disconnect Instance
```
DELETE /instance/logout/{instanceName}
Headers: apikey: YOUR_KEY
```

### Send Message
```
POST /message/sendText/{instanceName}
Headers: apikey: YOUR_KEY
Content-Type: application/json

Body:
{
  "number": "919025400934",
  "text": "Hello from Evolution API"
}
```

## Common Issues & Solutions

### Issue: 401 Unauthorized
**Solution:** Check your `EVOLUTION_API_KEY` in `.env.local`

### Issue: 404 Not Found
**Solution:** Verify the instance name `client1` exists. List all instances:
```bash
curl https://rafproj1-api.sitesv2.alburujits.com/instance/fetchInstances \
  -H "apikey: YOUR_KEY"
```

### Issue: QR Code Not Displaying
**Possible causes:**
1. Instance is already connected (check status first)
2. QR code expired (Evolution QRs expire after ~60 seconds)
3. Wrong response format from Evolution API

**Debug steps:**
1. Check browser console for errors
2. Check Next.js server logs
3. Test Evolution API directly with curl
4. Verify QR data format in response

### Issue: Connection Status Always "Disconnected"
**Check:**
1. WhatsApp is actually connected (check Evolution Manager)
2. API returns correct `state` field
3. Response format matches expected structure

## Security Best Practices

### ✅ DO:
- Store `EVOLUTION_API_KEY` in environment variables
- Use session-based authentication for the UI
- Keep Evolution Manager separate from client UI
- Log API errors for debugging
- Validate all inputs

### ❌ DON'T:
- Expose Evolution API key in client-side code
- Give clients direct Evolution Manager access
- Hard-code API keys in source code
- Skip authentication on API routes
- Log sensitive data (phone numbers, messages)

## Architecture Overview

```
┌─────────────┐
│   Browser   │
│  (Client)   │
└──────┬──────┘
       │
       │ HTTPS (authenticated)
       ▼
┌─────────────────────────────┐
│   Next.js App               │
│   ─────────────────────     │
│   • /connect-whatsapp       │ ← UI Page
│   • /api/whatsapp/.../qr    │ ← API Routes
│   • /api/whatsapp/.../status│
└──────────┬──────────────────┘
           │
           │ HTTPS + API Key
           ▼
┌─────────────────────────────┐
│   Evolution API             │
│   rafproj1-api.sitesv2...   │
│   ─────────────────────     │
│   • Instance: client1       │
│   • Connection Management   │
│   • Message Sending         │
└─────────────────────────────┘
```

## Evolution API Documentation

For comprehensive documentation:
- **Swagger UI**: `https://rafproj1-api.sitesv2.alburujits.com/docs`
- **Evolution GitHub**: https://github.com/EvolutionAPI/evolution-api
- **Official Docs**: Check Evolution API documentation

## Multi-Instance Support (Future Enhancement)

To support multiple client instances:

1. **Make instance dynamic:**
```typescript
// Instead of hardcoded "client1"
const instanceName = session.clientId; // Use client email/ID
```

2. **Update routes:**
```
/api/whatsapp/[instanceName]/status
/api/whatsapp/[instanceName]/qr
```

3. **Store instance mapping:**
```typescript
// In client-store.ts
interface ClientConfig {
  email: string;
  passwordHash: string;
  webhookUrl?: string;
  evolutionInstance: string; // Add this
}
```

4. **Dynamic UI:**
```typescript
// Page accepts instance as param or uses session
const instanceName = session.clientId;
```

## Monitoring & Maintenance

### Health Check
Create a cron job or health check endpoint:
```typescript
// app/api/health/whatsapp/route.ts
export async function GET() {
  const status = await fetch(`${EVOLUTION_BASE_URL}/instance/connectionState/client1`, {
    headers: { apikey: EVOLUTION_API_KEY }
  });
  return Response.json({ healthy: status.ok });
}
```

### Log Monitoring
Monitor these logs:
- QR generation failures
- Connection status changes
- API authentication errors
- Network timeouts

### Alerts
Set up alerts for:
- WhatsApp disconnections
- API key expiration
- High error rates
- Failed QR generations

## Support Contacts

- **Evolution API Issues**: Check Evolution API logs and GitHub issues
- **Integration Issues**: Review Next.js server logs
- **WhatsApp Issues**: Check WhatsApp Business API status

---

**Last Updated:** Created for Evolution API integration v1.0
