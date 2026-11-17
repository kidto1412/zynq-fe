import React from 'react';
import { RadarDiscoveryView } from '@/features/pairing/presentation/components/radar-discovery-view';
import { UniversalClipboardView } from '@/features/clipboard/presentation/components/universal-clipboard-view';
import { TransferStreamView } from '@/features/transfer/presentation/components/transfer-stream-view';
import { TrustedDevicesView } from '@/features/devices/presentation/components/trusted-devices-view';
import { ProUpgradeModal } from '@/features/billing/presentation/components/pro-upgrade-modal';
import { AuthModal } from '@/features/auth/presentation/components/auth-modal';
import { AuthGate } from '@/features/auth/presentation/components/auth-gate';
import { ZynqLogo } from '@/shared/components/ui/zynq-logo';
import { usePairingStore } from '@/features/pairing/presentation/stores/usePairingStore';
import { useClipboardStore } from '@/features/clipboard/presentation/stores/useClipboardStore';
import { useDeviceStore } from '@/features/devices/presentation/stores/useDeviceStore';
import { useAuthStore } from '@/features/auth/presentation/stores/useAuthStore';
import { Radio, Clipboard, ArrowLeftRight, Laptop, QrCode, Sparkles, User, LogOut } from 'lucide-react';

type Tab = 'radar' | 'clipboard' | 'transfer' | 'devices';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = React.useState<Tab>('radar');
  const [isProModalOpen, setIsProModalOpen] = React.useState(false);
  
  const { setQrModalOpen, initializeSocket, connectionStatus } = usePairingStore();
  const { loadVaultHistory } = useClipboardStore();
  const { fetchDevices } = useDeviceStore();
  const { user, isAuthenticated, setAuthModalOpen, logout, checkAuth } = useAuthStore();

  React.useEffect(() => {
    // 1. Verify existing session / token on mount
    checkAuth();
  }, [checkAuth]);

  React.useEffect(() => {
    // 2. Only initialize WebRTC signaling, device registration, and vault history when authenticated
    if (isAuthenticated) {
      initializeSocket();
      fetchDevices();
      loadVaultHistory();
    }
  }, [isAuthenticated, initializeSocket, fetchDevices, loadVaultHistory]);

  const getTabTitle = () => {
    if (!isAuthenticated) return 'Locked';
    switch (currentTab) {
      case 'radar':
        return 'Radar';
      case 'clipboard':
        return 'Clipboard';
      case 'transfer':
        return 'Transfer';
      case 'devices':
        return 'Devices';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface text-on-surface">
      {/* Fixed Header */}
      <header className="fixed top-0 w-full z-40 bg-surface-container-lowest/85 backdrop-blur-xl border-b border-white/[0.04] pt-safe shadow-[0_1px_12px_rgba(0,0,0,0.4)]">
        <div className="h-16 px-4 flex items-center justify-between gap-3 max-w-xl mx-auto">
          {/* Logo & Status */}
          <div className="flex items-center gap-3 min-w-0">
            <ZynqLogo size={36} animatePulse={connectionStatus === 'connected'} />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-headline text-base font-black tracking-tight text-on-surface truncate">
                  ZYNQ
                </span>
                <span className="text-xs text-on-surface-variant">•</span>
                <span className="font-headline text-base font-bold text-primary truncate">
                  {getTabTitle()}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  connectionStatus === 'connected'
                    ? 'bg-secondary animate-pulse shadow-[0_0_8px_rgba(78,222,163,0.8)]'
                    : connectionStatus === 'handshake'
                    ? 'bg-tertiary animate-ping'
                    : 'bg-primary animate-pulse'
                }`} />
                <span className="font-mono text-[11px] text-on-surface-variant truncate">
                  {connectionStatus === 'connected'
                    ? 'WebRTC P2P Direct · 5GHz'
                    : connectionStatus === 'handshake'
                    ? 'WebRTC Handshake'
                    : 'Signaling Active · NestJS Gateway'}
                </span>
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              aria-label="Scan QR Code"
              onClick={() => {
                if (!isAuthenticated) {
                  setAuthModalOpen(true, 'login');
                } else {
                  setQrModalOpen(true);
                }
              }}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface hover:text-primary transition-all border border-white/[0.04]"
            >
              <QrCode className="w-5 h-5" />
            </button>

            {/* User Profile or Auth Trigger */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-1 bg-surface-container px-2.5 py-1 rounded-xl border border-white/[0.04]">
                <div className="w-6 h-6 rounded-lg bg-primary/20 text-primary flex items-center justify-center text-xs font-bold font-mono">
                  {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                </div>
                <button
                  onClick={logout}
                  title="Logout"
                  className="p-1 text-on-surface-variant hover:text-error transition-colors rounded-md"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true, 'login')}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface hover:text-primary transition-all border border-white/[0.04]"
                title="Masuk / Daftar"
              >
                <User className="w-5 h-5" />
              </button>
            )}

            {/* Pro Upgrade Trigger */}
            <button
              aria-label="Upgrade to Pro"
              onClick={() => setIsProModalOpen(true)}
              className="h-10 px-3 rounded-xl bg-gradient-to-r from-primary/20 to-secondary/20 hover:from-primary/30 hover:to-secondary/30 text-primary border border-primary/30 flex items-center gap-1.5 text-xs font-headline font-bold shadow-[0_0_12px_rgba(76,215,246,0.15)] transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-tertiary animate-spin" style={{ animationDuration: '6s' }} />
              <span>PRO</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full pt-20 px-4 max-w-xl mx-auto pb-24">
        {!isAuthenticated ? (
          <AuthGate />
        ) : (
          <>
            {currentTab === 'radar' && <RadarDiscoveryView />}
            {currentTab === 'clipboard' && <UniversalClipboardView />}
            {currentTab === 'transfer' && <TransferStreamView />}
            {currentTab === 'devices' && <TrustedDevicesView />}
          </>
        )}
      </main>

      {/* Fixed Bottom Navigation Bar - Only available after login */}
      {isAuthenticated && (
        <nav className="fixed bottom-0 w-full z-40 pb-safe bg-surface-container-lowest/90 backdrop-blur-2xl border-t border-white/[0.04] shadow-[0_-1px_16px_rgba(0,0,0,0.5)]">
          <div className="flex justify-around items-center h-16 px-4 max-w-xl mx-auto">
            <button
              onClick={() => setCurrentTab('radar')}
              className={`flex flex-col items-center justify-center gap-1 w-16 h-12 transition-all rounded-xl ${
                currentTab === 'radar'
                  ? 'text-primary shadow-[0_0_16px_rgba(76,215,246,0.25)] bg-surface-container/60'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Radio className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Radar</span>
            </button>

            <button
              onClick={() => setCurrentTab('clipboard')}
              className={`flex flex-col items-center justify-center gap-1 w-16 h-12 transition-all rounded-xl ${
                currentTab === 'clipboard'
                  ? 'text-primary shadow-[0_0_16px_rgba(76,215,246,0.25)] bg-surface-container/60'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Clipboard className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Clipboard</span>
            </button>

            <button
              onClick={() => setCurrentTab('transfer')}
              className={`flex flex-col items-center justify-center gap-1 w-16 h-12 transition-all rounded-xl ${
                currentTab === 'transfer'
                  ? 'text-primary shadow-[0_0_16px_rgba(76,215,246,0.25)] bg-surface-container/60'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <ArrowLeftRight className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Transfer</span>
            </button>

            <button
              onClick={() => setCurrentTab('devices')}
              className={`flex flex-col items-center justify-center gap-1 w-16 h-12 transition-all rounded-xl ${
                currentTab === 'devices'
                  ? 'text-primary shadow-[0_0_16px_rgba(76,215,246,0.25)] bg-surface-container/60'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Laptop className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Devices</span>
            </button>
          </div>
        </nav>
      )}

      {/* Modals */}
      <ProUpgradeModal open={isProModalOpen} onOpenChange={setIsProModalOpen} />
      <AuthModal />
    </div>
  );
};
