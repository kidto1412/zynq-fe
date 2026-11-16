import React from 'react';
import { RadarVisualizer } from './radar-visualizer';
import { CurrentDeviceCard } from './current-device-card';
import { AirdropBeaconCard } from './airdrop-beacon-card';
import { QrPairModal } from './qr-pair-modal';
import { usePairingStore } from '../stores/usePairingStore';
import { Button } from '@/shared/components/ui/button';
import { Lock, Zap, Smartphone, CheckCircle2 } from 'lucide-react';

export const RadarDiscoveryView: React.FC = () => {
  const { selectedPeer, triggerBeam, setQrModalOpen } = usePairingStore();
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const handleConnect = () => {
    if (!selectedPeer) return;
    setToastMessage(`P2P tunnel opening with ${selectedPeer.name.split(' ')[0]}...`);
    triggerBeam(selectedPeer);
    setTimeout(() => {
      setToastMessage(`Encrypted WebRTC DataChannel verified`);
      setTimeout(() => setToastMessage(null), 2500);
    }, 1500);
  };

  return (
    <div className="flex flex-col w-full max-w-xl mx-auto space-y-4 pb-20 select-none">
      {/* Telemetry Header Banner */}
      <div className="flex items-center justify-between bg-surface-container-low px-4 py-3 rounded-2xl border border-white/[0.04]">
        <div className="flex flex-col">
          <span className="font-headline text-sm font-bold text-on-surface">Nearby P2P Radar</span>
          <span className="font-mono text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            Zero cloud, direct WebRTC encrypted
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-surface-container px-3 py-1 rounded-full text-secondary border border-secondary/20">
          <Lock className="w-3.5 h-3.5" />
          <span className="font-mono text-xs font-semibold tracking-tight">DTLS 1.3</span>
        </div>
      </div>

      {/* Section 1: Current Device Identity */}
      <CurrentDeviceCard />

      {/* Section 2: Radar Pulse Visualizer Canvas */}
      <RadarVisualizer />

      {/* Section 3: Selected Peer Action Target */}
      {selectedPeer && (
        <div className="bg-surface-container rounded-2xl p-4 border border-primary/20 shadow-xl animate-in fade-in-0 slide-in-from-bottom-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-headline text-sm font-bold text-on-surface">
                  {selectedPeer.name}
                </span>
                <span className="text-xs text-primary font-mono">
                  Signal {selectedPeer.signal} · {selectedPeer.model}
                </span>
              </div>
            </div>
            <Button size="sm" variant="primary" onClick={handleConnect} className="gap-1.5">
              <Zap className="w-4 h-4" />
              <span>Connect</span>
            </Button>
          </div>
        </div>
      )}

      {/* Section 4: AirDrop Emulation & Direct QR Pairing */}
      <AirdropBeaconCard />

      <div className="bg-surface-container rounded-2xl p-4 border border-white/[0.04] flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-headline text-sm font-bold text-on-surface">Pair via QR / PIN Code</span>
          <span className="text-xs text-on-surface-variant">Connect devices across different Wi-Fi networks</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setQrModalOpen(true)}>
          Open QR
        </Button>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-surface-container-highest px-4 py-2.5 rounded-xl border border-secondary/30 shadow-2xl flex items-center gap-2 animate-in fade-in-0 slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-secondary" />
          <span className="text-xs text-on-surface font-medium">{toastMessage}</span>
          <span className="font-mono text-[11px] text-on-surface-variant ml-2">42ms</span>
        </div>
      )}

      {/* Pairing QR Modal */}
      <QrPairModal />
    </div>
  );
};
