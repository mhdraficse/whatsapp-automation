import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getClientConfig } from '@/lib/client-store';

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL || 'https://rafproj1-api.sitesv2.alburujits.com';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

interface EvolutionQRResponse {
  pairingCode?: string;
  code?: string;
  base64?: string;
  qrcode?: {
    base64?: string;
    code?: string;
  };
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
        { error: 'No WhatsApp instance configured for your account' },
        { status: 404 }
      );
    }

    const instanceName = clientConfig.instanceName;

    // Call Evolution API to get/generate QR code
    const response = await fetch(`${EVOLUTION_BASE_URL}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Evolution API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return NextResponse.json(
        { error: 'Failed to generate QR code' },
        { status: response.status }
      );
    }

    const data: EvolutionQRResponse = await response.json();
    
    // Evolution API may return QR in different formats
    let qrData = '';
    
    if (data.base64) {
      qrData = data.base64;
    } else if (data.qrcode?.base64) {
      qrData = data.qrcode.base64;
    } else if (data.code) {
      qrData = data.code;
    } else if (data.qrcode?.code) {
      qrData = data.qrcode.code;
    }

    if (!qrData) {
      console.error('No QR data in response:', data);
      return NextResponse.json(
        { error: 'QR code not available' },
        { status: 500 }
      );
    }

    // Ensure it's a proper data URL
    if (!qrData.startsWith('data:image')) {
      qrData = `data:image/png;base64,${qrData}`;
    }

    return NextResponse.json({
      qr: qrData,
      pairingCode: data.pairingCode,
      instanceName: instanceName,
    });

  } catch (error) {
    console.error('Error generating QR code:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
