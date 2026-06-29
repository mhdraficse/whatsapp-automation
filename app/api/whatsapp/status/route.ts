import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getClientConfig } from '@/lib/client-store';

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL || 'https://rafproj1-api.sitesv2.alburujits.com';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

interface EvolutionStatusResponse {
  instance: {
    instanceName: string;
    state?: string;
  };
  connectionStatus?: string;
  ownerJid?: string;
  profileName?: string;
  profilePictureUrl?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!EVOLUTION_API_KEY) {
      console.error('EVOLUTION_API_KEY not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Get client config to find their instance name
    const clientConfig = await getClientConfig(session.clientId);
    
    if (!clientConfig || !clientConfig.instanceName) {
      return NextResponse.json(
        { error: 'No WhatsApp instance configured for your account', connected: false },
        { status: 404 }
      );
    }

    const instanceName = clientConfig.instanceName;

    // Call Evolution API to get instance connection status
    const response = await fetch(`${EVOLUTION_BASE_URL}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Evolution API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch connection status', connected: false },
        { status: response.status }
      );
    }

    const data: EvolutionStatusResponse = await response.json();
    
    // Evolution API returns state like "open" when connected
    const isConnected = data.instance?.state === 'open' || data.connectionStatus === 'open';
    
    // Extract phone number from ownerJid (format: 919025400934@s.whatsapp.net)
    let deviceNumber = '';
    if (data.ownerJid) {
      deviceNumber = data.ownerJid.split('@')[0];
    }

    return NextResponse.json({
      connected: isConnected,
      deviceName: data.profileName || '',
      deviceNumber: deviceNumber,
      state: data.instance?.state || data.connectionStatus || 'disconnected',
      instanceName: instanceName,
    });

  } catch (error) {
    console.error('Error fetching WhatsApp status:', error);
    return NextResponse.json(
      { error: 'Internal server error', connected: false },
      { status: 500 }
    );
  }
}
