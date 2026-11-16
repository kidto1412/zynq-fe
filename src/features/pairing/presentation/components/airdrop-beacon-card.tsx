import React from 'react';
import { usePairingStore } from '../stores/usePairingStore';
import { Navigation } from 'lucide-react';

export const AirdropBeaconCard: React.FC = () => {
  const { airdropEmulation, toggleAirdrop } = usePairingStore();

  return (
    <div className="bg-surface-container-low rounded-2xl p-4 border border-white/[0.04] flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary">
          <Navigation className="w-5 h-5 rotate-45" />
        </div>
        <div className="flex flex-col">
          <span className="font-headline text-sm font-semibold text-on-surface">
            AirDrop Bridge Emulation
          </span>
          <span className="text-xs text-on-surface-variant">
            Auto-detect Apple peer beacons across subnet
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={toggleAirdrop}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
          airdropEmulation ? 'bg-primary' : 'bg-surface-container-highest'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-on-primary shadow-md transition-transform ${
            airdropEmulation ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};
