import React from 'react';
import { useDeviceStore } from '../stores/useDeviceStore';
import { 
  ShieldCheck, 
  Smartphone, 
  Laptop, 
  Zap, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Lock, 
  Trash2, 
  History,
  CheckCircle2
} from 'lucide-react';

export const TrustedDevicesView: React.FC = () => {
  const { devices, logs, toggleAutoAccept, toggleClipboardSharing, revokeDevice } = useDeviceStore();
  const [verifiedSha, setVerifiedSha] = React.useState<string | null>(null);

  const getDeviceIcon = (platform: string) => {
    switch (platform) {
      case 'ios':
      case 'android':
        return <Smartphone className="w-5 h-5" />;
      default:
        return <Laptop className="w-5 h-5" />;
    }
  };

  return (
    <div className="flex flex-col w-full max-w-xl mx-auto space-y-4 pb-20 select-none">
      {/* Overview Header Metrics Pill */}
      <div className="w-full bg-surface-container-low rounded-2xl p-4 shadow-md border border-white/[0.04] flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-headline text-sm font-bold text-on-surface truncate">
              Trusted Devices & History
            </span>
            <span className="text-xs text-on-surface-variant truncate">
              Manage auto-accept permissions & transfer logs
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end flex-shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high border border-white/[0.04]">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span className="font-mono text-xs text-secondary font-semibold">
              {devices.length} Paired
            </span>
          </span>
        </div>
      </div>

      {/* Section 1: Trusted Device Mesh */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="font-headline text-xs font-bold uppercase tracking-wider text-on-surface">
            Trusted Device Mesh
          </span>
          <span className="font-mono text-xs text-on-surface-variant">
            {devices.filter((d) => d.connectionStatus === 'connected').length}/{devices.length} Online
          </span>
        </div>

        {devices.map((device) => (
          <div
            key={device.id}
            className="bg-surface-container rounded-2xl p-4 shadow-sm border border-white/[0.04] space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface flex-shrink-0">
                  {getDeviceIcon(device.platform)}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-headline text-sm font-bold text-on-surface truncate">
                    {device.name}
                  </span>
                  <span className="font-mono text-xs text-on-surface-variant">
                    {device.osVersion}
                  </span>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-xs flex-shrink-0 ${
                  device.connectionStatus === 'connected'
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'bg-surface-container-highest text-on-surface-variant'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    device.connectionStatus === 'connected'
                      ? 'bg-on-secondary-container animate-pulse'
                      : 'bg-on-surface-variant'
                  }`}
                />
                {device.lastActive}
              </span>
            </div>

            {/* Quick Toggles */}
            <div className="bg-surface-container-low rounded-xl p-3 flex flex-col gap-2 border border-white/[0.03]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-on-surface">Auto-Accept Transfers</span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleAutoAccept(device.id)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    device.autoAccept ? 'bg-primary' : 'bg-surface-container-highest'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-on-primary transition-transform ${
                      device.autoAccept ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-secondary" />
                  <span className="text-xs font-medium text-on-surface">Clipboard Sharing (Two-Way)</span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleClipboardSharing(device.id)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    device.clipboardSharing ? 'bg-primary' : 'bg-surface-container-highest'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-on-primary transition-transform ${
                      device.clipboardSharing ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* E2EE Security Fingerprint Tag */}
            <div className="flex items-center justify-between bg-surface-container-lowest px-3 py-2 rounded-xl border border-white/[0.03]">
              <div className="flex items-center gap-2 min-w-0">
                <Lock className="w-3.5 h-3.5 text-tertiary flex-shrink-0" />
                <span className="font-mono text-xs text-on-surface-variant truncate">
                  SHA256: {device.fingerprintSha}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setVerifiedSha(device.id);
                    setTimeout(() => setVerifiedSha(null), 2000);
                  }}
                  className="font-mono text-xs text-primary hover:underline"
                >
                  {verifiedSha === device.id ? 'Verified ✓' : 'Verify'}
                </button>
                <button
                  onClick={() => revokeDevice(device.id)}
                  className="p-1 rounded-md text-on-surface-variant hover:text-error transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Section 2: Recent Transfer Logs */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <History className="w-4 h-4 text-primary" />
            <span className="font-headline text-xs font-bold uppercase tracking-wider text-on-surface">
              Recent Transfer Logs
            </span>
          </div>
          <span className="font-mono text-xs text-on-surface-variant">Last 24h</span>
        </div>

        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-surface-container rounded-xl p-3 border border-white/[0.04] flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-surface-container-highest flex items-center justify-center text-primary flex-shrink-0">
                  {log.direction === 'sent' ? (
                    <ArrowUpRight className="w-4 h-4 text-secondary" />
                  ) : (
                    <ArrowDownLeft className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-headline text-xs font-bold text-on-surface truncate">
                    {log.fileName}
                  </span>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-on-surface-variant">
                    <span>{log.fileSize}</span>
                    <span>•</span>
                    <span>{log.speed}</span>
                    <span>•</span>
                    <span>{log.targetDevice}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-mono text-[11px] text-secondary flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Done
                </span>
                <span className="font-mono text-[10px] text-on-surface-variant">{log.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
