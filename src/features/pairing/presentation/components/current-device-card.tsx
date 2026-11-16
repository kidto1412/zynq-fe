import React from 'react';
import { usePairingStore } from '../stores/usePairingStore';
import { Smartphone, ShieldCheck, Radio } from 'lucide-react';

export const CurrentDeviceCard: React.FC = () => {
  const { currentDevice } = usePairingStore();

  return (
    <div className="bg-surface-container rounded-2xl p-4 shadow-lg border border-white/[0.04] relative overflow-hidden">
      <div className="absolute -right-10 -bottom-10 w-28 h-28 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center text-primary shadow-sm border border-white/[0.05]">
            <Smartphone className="w-6 h-6" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-headline text-base font-bold text-on-surface truncate">
                {currentDevice.name}
              </span>
              <span className="text-xs text-primary font-medium">• {currentDevice.model}</span>
            </div>
            <span className="font-mono text-xs text-on-surface-variant truncate">
              {currentDevice.ip}
            </span>
          </div>
        </div>

        <div className="flex items-center">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary" />
          </span>
        </div>
      </div>

      {/* Identity Fingerprint & Mesh Hash */}
      <div className="mt-3.5 pt-3 bg-surface-container-lowest/60 -mx-4 -mb-4 px-4 py-2.5 flex items-center justify-between border-t border-white/[0.04]">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-secondary" />
          <span className="font-mono text-xs text-on-surface-variant tracking-wider">
            FP: {currentDevice.fingerprint}
          </span>
        </div>
        <div className="flex items-center gap-1 text-primary">
          <span className="text-[10px] font-bold uppercase tracking-wider">Broadcasting</span>
          <Radio className="w-3.5 h-3.5 animate-pulse" />
        </div>
      </div>
    </div>
  );
};
