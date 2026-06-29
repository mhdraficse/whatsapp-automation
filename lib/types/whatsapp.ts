/**
 * WhatsApp Connection Types
 * Used for Evolution API integration
 */

export interface WhatsAppConnectionStatus {
  connected: boolean;
  deviceName?: string;
  deviceNumber?: string;
  state?: 'open' | 'close' | 'connecting' | 'disconnected';
}

export interface WhatsAppQRResponse {
  qr: string; // data URL or base64 string
  pairingCode?: string;
  error?: string;
}

export interface EvolutionInstanceStatus {
  instance: {
    instanceName: string;
    state?: 'open' | 'close' | 'connecting';
    status?: string;
  };
  connectionStatus?: string;
  ownerJid?: string; // Format: 919025400934@s.whatsapp.net
  profileName?: string;
  profilePictureUrl?: string;
}

export interface EvolutionQRData {
  pairingCode?: string;
  code?: string;
  base64?: string;
  qrcode?: {
    base64?: string;
    code?: string;
  };
}

export interface EvolutionAPIError {
  error: string;
  message?: string;
  statusCode?: number;
}
