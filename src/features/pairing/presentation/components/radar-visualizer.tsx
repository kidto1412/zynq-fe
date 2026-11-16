import React from 'react';
import { usePairingStore } from '../stores/usePairingStore';
import { Smartphone, Laptop, Tablet, Radio, QrCode } from 'lucide-react';

export const RadarVisualizer: React.FC = () => {
  const { nearbyPeers, selectedPeer, selectPeer, setQrModalOpen } = usePairingStore();

  const getIcon = (platform: string) => {
    switch (platform) {
      case 'ios':
      case 'android':
        return <Smartphone className="w-5 h-5" />;
      case 'macos':
      case 'windows':
      case 'linux':
        return <Laptop className="w-5 h-5" />;
      default:
        return <Tablet className="w-5 h-5" />;
    }
  };

  // Orbital positions for dynamic peers
  const orbitalPositions = [
    { top: '16px', right: '32px' },
    { bottom: '24px', left: '32px' },
    { bottom: '32px', right: '40px' },
    { top: '24px', left: '40px' },
  ];

  return (
    <div className="relative bg-surface-container-lowest rounded-2xl p-4 h-72 flex flex-col justify-center items-center overflow-hidden border border-white/[0.04] shadow-2xl">
      {/* Ambient Radial Gradient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(76,215,246,0.12)_0%,transparent_75%)] pointer-events-none" />

      {/* Concentric Pulse Rings */}
      <div 
        className="absolute w-64 h-64 rounded-full bg-primary/5 border border-primary/20 animate-ping pointer-events-none" 
        style={{ animationDuration: '4s', animationIterationCount: 'infinite' }} 
      />
      <div className="absolute w-56 h-56 rounded-full border border-surface-container/60 pointer-events-none" />
      <div className="absolute w-40 h-40 rounded-full border border-surface-container-high/80 pointer-events-none" />
      <div className="absolute w-24 h-24 rounded-full bg-surface-container-highest/60 border border-primary/30 flex items-center justify-center">
        <Radio className="w-6 h-6 text-primary animate-pulse" />
      </div>

      {/* Crosshair Grid Lines */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <div className="w-full h-px bg-surface-variant" />
        <div className="h-full w-px bg-surface-variant absolute" />
      </div>

      {/* Dynamic Peer Nodes */}
      {nearbyPeers.length > 0 ? (
        nearbyPeers.map((peer, idx) => {
          const pos = orbitalPositions[idx % orbitalPositions.length];
          const isSelected = selectedPeer?.id === peer.id;

          return (
            <div
              key={peer.id}
              onClick={() => selectPeer(peer)}
              style={pos}
              className="absolute z-10 flex flex-col items-center group cursor-pointer transition-transform duration-200 active:scale-95"
            >
              <div className="relative flex items-center justify-center">
                <div className="absolute -inset-1 rounded-full bg-primary/30 blur-sm animate-pulse" />
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all ${
                    isSelected
                      ? 'bg-primary text-on-primary ring-2 ring-primary ring-offset-2 ring-offset-surface'
                      : 'bg-surface-container-high text-primary hover:bg-surface-container-highest'
                  }`}
                >
                  {getIcon(peer.platform)}
                </div>
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-secondary shadow-sm" />
              </div>
              <div className="mt-1.5 bg-surface-container/90 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/[0.05] shadow-sm text-center">
                <span className="font-mono text-xs text-on-surface font-medium truncate block max-w-[110px]">
                  {peer.name}
                </span>
              </div>
            </div>
          );
        })
      ) : (
        /* Empty State: Scanning radar */
        <div className="absolute bottom-6 flex flex-col items-center text-center z-10 space-y-1">
          <span className="font-mono text-xs text-on-surface font-medium">
            Memindai perangkat di jaringan lokal...
          </span>
          <button
            onClick={() => setQrModalOpen(true)}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline font-mono"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Buka QR / Masukkan PIN</span>
          </button>
        </div>
      )}

      {/* Telemetry pill */}
      <div className="absolute top-3 left-3 bg-surface-container-lowest/80 px-2.5 py-1 rounded-full border border-white/[0.04] flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
        <span className="font-mono text-[11px] text-on-surface-variant">
          Mesh Radar Active · {nearbyPeers.length} Peer Terhubung
        </span>
      </div>
    </div>
  );
};
