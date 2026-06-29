'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface ConnectionStatus {
  connected: boolean;
  deviceName?: string;
  deviceNumber?: string;
  state?: string;
}

function formatPhone(number: string) {
  if (!number) return '';
  if (number.length > 10) {
    const cc = number.slice(0, -10);
    const rest = number.slice(-10);
    return `+${cc} ${rest.slice(0, 5)} ${rest.slice(5)}`;
  }
  return number;
}

// WhatsApp logo SVG (official green)
function WhatsAppIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#25D366" />
      <path
        d="M23.5 8.5A10.44 10.44 0 0016 5.5C10.2 5.5 5.5 10.2 5.5 16c0 1.85.48 3.65 1.4 5.24L5.5 26.5l5.38-1.4A10.44 10.44 0 0016 26.5c5.8 0 10.5-4.7 10.5-10.5 0-2.8-1.09-5.43-3-7.5z"
        fill="white"
        fillOpacity="0.15"
      />
      <path
        d="M22.11 19.79c-.31.87-1.55 1.6-2.54 1.81-.68.14-1.56.26-4.53-1.04-3.8-1.63-6.25-5.5-6.44-5.75-.18-.25-1.5-2-.5-3.87.44-.82 1.1-1.3 1.7-1.3.2 0 .38.01.54.02.48.02.72.05 1.04.8.4.93 1.37 3.27 1.49 3.51.12.24.24.56.07.9-.16.35-.3.56-.54.84-.24.28-.47.5-.63.67-.24.25-.49.52-.21.99.28.46 1.25 2.04 2.68 3.31 1.84 1.63 3.36 2.15 3.87 2.38.41.19.64.16.88-.1.3-.32 1.3-1.52 1.64-2.04.34-.52.67-.44 1.13-.27.46.17 2.92 1.38 3.42 1.63.5.25.83.37.95.57.12.48-.18 1.87-.49 2.74z"
        fill="white"
      />
    </svg>
  );
}

function Spinner({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg
      className="animate-spin"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ color }}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export default function ConnectWhatsAppPage() {
  const router = useRouter();
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string>('');
  const [qrLoading, setQrLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [polling, setPolling] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [justConnected, setJustConnected] = useState(false);

  const fetchStatus = useCallback(async (quiet = false) => {
    try {
      const res = await fetch('/api/whatsapp/status');
      if (res.status === 401) { router.push('/login'); return null; }
      if (res.status === 404) {
        setError('No WhatsApp instance is configured for your account. Contact your administrator.');
        return null;
      }
      if (!res.ok) throw new Error();
      const data: ConnectionStatus = await res.json();
      setStatus(prev => {
        if (prev && !prev.connected && data.connected) setJustConnected(true);
        return data;
      });
      if (data.connected) { setPolling(false); setQrCode(''); }
      return data;
    } catch {
      if (!quiet) setError('Could not reach the server. Please refresh.');
      return null;
    } finally {
      setInitialLoading(false);
    }
  }, [router]);

  const generateQR = async () => {
    setQrLoading(true);
    setError('');
    try {
      const res = await fetch('/api/whatsapp/qr');
      if (res.status === 401) { router.push('/login'); return; }
      if (res.status === 404) {
        setError('No WhatsApp instance configured for your account. Contact your administrator.');
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setQrCode(data.qr);
      setPolling(true);
      setSecondsLeft(5);
    } catch {
      setError('Could not generate QR code. Please try again or contact support.');
    } finally {
      setQrLoading(false);
    }
  };

  // Initial load
  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Polling countdown
  useEffect(() => {
    if (!polling) return;
    const tick = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { fetchStatus(true); return 5; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [polling, fetchStatus]);

  const showInitLoader   = initialLoading;
  const showConnected    = !initialLoading && !!status?.connected;
  const showDisconnected = !initialLoading && !!status && !status.connected && !qrCode;
  const showQR           = !initialLoading && !!qrCode && !status?.connected;

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Top nav bar */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Dashboard
          </button>
          <div className="flex items-center gap-2 text-sm font-medium">
            <WhatsAppIcon size={20} />
            WhatsApp
          </div>
          <div className="w-20" /> {/* spacer to center the title */}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-md flex flex-col gap-4">

          {/* Page title */}
          <div className="text-center mb-2">
            <h1 className="text-2xl font-semibold tracking-tight">Connect WhatsApp</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Link your WhatsApp account to send campaigns
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 flex items-start gap-3">
              <svg className="shrink-0 mt-0.5 text-destructive" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* ── Initial loading ── */}
          {showInitLoader && (
            <div className="rounded-xl border border-border bg-card p-10 flex flex-col items-center gap-4">
              <Spinner size={32} color="var(--muted-foreground)" />
              <p className="text-sm text-muted-foreground">Checking connection status…</p>
            </div>
          )}

          {/* ── Connected ── */}
          {showConnected && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {/* Green accent strip */}
              <div className="h-1 bg-[#25D366]" />
              <div className="p-8 flex flex-col items-center gap-5 text-center">

                {justConnected && (
                  <div className="text-xs font-medium uppercase tracking-widest text-[#25D366]">
                    Just connected 🎉
                  </div>
                )}

                {/* Avatar ring */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-[#25D366]/10 flex items-center justify-center">
                    <WhatsAppIcon size={40} />
                  </div>
                  <span className="absolute bottom-0 right-0 w-5 h-5 bg-[#25D366] rounded-full flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>

                <div>
                  <p className="font-semibold text-lg leading-tight">
                    {status?.deviceName || 'Connected'}
                  </p>
                  {status?.deviceNumber && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {formatPhone(status.deviceNumber)}
                    </p>
                  )}
                </div>

                <div className="w-full rounded-lg bg-[#25D366]/8 border border-[#25D366]/20 px-4 py-3">
                  <p className="text-sm text-[#1a9e4e] dark:text-[#4ade80] font-medium">
                    Active — ready to send campaigns
                  </p>
                </div>

                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full rounded-lg bg-primary text-primary-foreground text-sm font-medium py-2.5 hover:opacity-90 transition-opacity"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}

          {/* ── Disconnected ── */}
          {showDisconnected && (
            <div className="rounded-xl border border-border bg-card p-8 flex flex-col items-center gap-6 text-center">

              {/* Icon */}
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.5" className="text-muted-foreground">
                  <path d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18h3"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <div>
                <p className="font-semibold text-base">Not connected</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Scan a QR code to link your WhatsApp
                </p>
              </div>

              {/* Status pill */}
              <div className="flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                <span className="text-xs text-muted-foreground">Disconnected</span>
              </div>

              <button
                onClick={generateQR}
                disabled={qrLoading}
                className="w-full rounded-lg bg-[#25D366] text-white text-sm font-semibold py-3 flex items-center justify-center gap-2
                           hover:bg-[#1ebe5d] active:bg-[#18a850] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {qrLoading ? (
                  <>
                    <Spinner size={16} color="white" />
                    Generating…
                  </>
                ) : (
                  <>
                    <WhatsAppIcon size={18} />
                    Generate QR Code
                  </>
                )}
              </button>
            </div>
          )}

          {/* ── QR Code ── */}
          {showQR && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">

              {/* Header */}
              <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Scan with WhatsApp</p>
                  <p className="text-xs text-muted-foreground mt-0.5">QR code ready — use your phone</p>
                </div>
                {/* Live countdown */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#25D366]" />
                  </span>
                  Checking in {secondsLeft}s
                </div>
              </div>

              {/* QR */}
              <div className="p-6 flex flex-col items-center gap-5">
                <div className="rounded-xl border-2 border-border p-3 bg-white shadow-sm inline-block">
                  <img
                    src={qrCode}
                    alt="WhatsApp QR Code"
                    className="w-56 h-56 block"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>

                {/* Steps */}
                <ol className="w-full space-y-2">
                  {[
                    'Open WhatsApp on your phone',
                    'Tap Settings → Linked devices',
                    'Tap Link a device',
                    'Point your camera at this QR',
                  ].map((step, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-secondary text-secondary-foreground
                                       text-[11px] font-semibold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>

                {/* Refresh */}
                <button
                  onClick={generateQR}
                  disabled={qrLoading}
                  className="w-full rounded-lg border border-border bg-secondary text-secondary-foreground
                             text-sm font-medium py-2.5 flex items-center justify-center gap-2
                             hover:bg-secondary/70 transition-colors disabled:opacity-50"
                >
                  {qrLoading ? (
                    <><Spinner size={14} />Refreshing…</>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Refresh QR Code
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Help text */}
          {!initialLoading && !error && (
            <p className="text-center text-xs text-muted-foreground">
              Having trouble?{' '}
              <a href="mailto:support@example.com" className="underline underline-offset-2 hover:text-foreground transition-colors">
                Contact support
              </a>
            </p>
          )}

        </div>
      </main>
    </div>
  );
}
