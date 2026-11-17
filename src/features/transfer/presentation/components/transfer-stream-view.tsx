import React from 'react';
import { useTransferStore } from '../stores/useTransferStore';
import { useAuthStore } from '@/features/auth/presentation/stores/useAuthStore';
import { GaugeRing } from './gauge-ring';
import { ChunkStreamMatrix } from './chunk-stream-matrix';
import { FileDropzone } from './file-dropzone';
import { formatBytes } from '@/shared/lib/utils';
import {
  Smartphone,
  ArrowRight,
  Film,
  Folder,
  Pause,
  Play,
  X,
  Zap,
  Hourglass,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export const TransferStreamView: React.FC = () => {
  const { activeTransfer, isPaused, togglePause, cancelTransfer, error } = useTransferStore();
  const user = useAuthStore((state) => state.user);
  const isPro = user?.plan === 'PRO_LIFETIME';

  const percentage =
    activeTransfer && activeTransfer.fileSize > 0
      ? Math.min(100, Math.floor((activeTransfer.transferredBytes / activeTransfer.fileSize) * 100))
      : 0;

  return (
    <div className="flex flex-col w-full max-w-xl mx-auto space-y-4 pb-20 select-none">
      {/* Telemetry Header */}
      <div className="flex flex-col gap-1 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary">
            WebRTC DataChannel 0x4F92
          </span>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-high border border-white/[0.04]">
            <span className={`w-1.5 h-1.5 rounded-full ${activeTransfer ? 'bg-secondary animate-pulse' : 'bg-surface-variant'}`} />
            <span className="font-mono text-xs text-secondary">
              Status: {activeTransfer ? activeTransfer.status.toUpperCase() : 'STANDBY'}
            </span>
          </div>
        </div>
        <p className="text-xs text-on-surface-variant">
          {isPro
            ? 'Mesh Group Beam (Hingga 5 Perangkat) · Auto-Resume enabled'
            : 'Direct 1-to-1 P2P Chunk Streaming · WebRTC DataChannel'}
        </p>
      </div>

      {error && (
        <div className="bg-error-container/20 border border-error/30 p-3 rounded-xl flex items-center gap-2 text-xs text-error font-mono">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hero Visualizer: Active Transfer Card */}
      {activeTransfer ? (
        <div className="relative overflow-hidden rounded-2xl bg-surface-container p-4 shadow-xl border border-white/[0.04]">
          <div className="absolute -right-16 -top-16 w-44 h-44 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 w-36 h-36 rounded-full bg-secondary/10 blur-2xl pointer-events-none" />

          {/* Direction Route Badge */}
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-center gap-2 bg-surface-container-lowest/80 px-3 py-1 rounded-full border border-white/[0.04]">
              <Smartphone className="w-3.5 h-3.5 text-primary" />
              <span className="font-mono text-xs text-on-surface">{activeTransfer.senderDevice}</span>
              <ArrowRight className="w-3.5 h-3.5 text-secondary" />
              <Smartphone className="w-3.5 h-3.5 text-primary" />
              <span className="font-mono text-xs text-on-surface">{activeTransfer.receiverDevice}</span>
            </div>
            <div className="flex items-center gap-2">
              {activeTransfer.isResumed && (
                <span className="flex items-center gap-1 font-mono text-[11px] text-secondary bg-secondary/15 px-2.5 py-0.5 rounded-full border border-secondary/30">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  Auto-Resumed
                </span>
              )}
              <span className="font-mono text-xs text-secondary bg-secondary/10 px-2.5 py-0.5 rounded-full border border-secondary/20">
                {activeTransfer.status === 'streaming' ? 'Active Beam' : 'Idle'}
              </span>
            </div>
          </div>

          {/* Folder Batch Metadata if active */}
          {activeTransfer.isFolder && (
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-on-surface bg-surface-container-lowest px-2.5 py-1 rounded-lg border border-white/[0.04] mb-2">
              <Folder className="w-3.5 h-3.5 text-secondary flex-shrink-0" />
              <span className="truncate">
                Folder Tree · File {activeTransfer.batchIndex} dari {activeTransfer.batchTotal}:{' '}
                <span className="text-secondary font-semibold">{activeTransfer.relativePath || activeTransfer.fileName}</span>
              </span>
            </div>
          )}

          {/* File Metadata & Circular Gauge */}
          <div className="flex items-center gap-4 my-2">
            <GaugeRing percentage={percentage} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                {activeTransfer.isFolder ? (
                  <Folder className="w-4 h-4 text-secondary flex-shrink-0" />
                ) : (
                  <Film className="w-4 h-4 text-primary flex-shrink-0" />
                )}
                <span className="font-headline text-sm text-on-surface font-semibold truncate">
                  {activeTransfer.fileName}
                </span>
              </div>
              <p className="font-mono text-xs text-on-surface-variant">
                <span className="text-primary font-bold">
                  {formatBytes(activeTransfer.transferredBytes)}
                </span>{' '}
                of {formatBytes(activeTransfer.fileSize)}
              </p>

              {/* Speed & ETA Telemetry */}
              <div className="flex items-center gap-2 mt-2.5">
                <div className="flex items-center gap-1 bg-surface-container-lowest px-2 py-1 rounded-lg border border-white/[0.04]">
                  <Zap className="w-3 h-3 text-secondary" />
                  <span className="font-mono text-xs font-semibold text-secondary">
                    {activeTransfer.speedMBs} MB/s
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-surface-container-lowest px-2 py-1 rounded-lg border border-white/[0.04]">
                  <Hourglass className="w-3 h-3 text-tertiary" />
                  <span className="font-mono text-xs text-tertiary">
                    {activeTransfer.etaSeconds}s left
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Linear Gradient Progress Line */}
          <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden my-3">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5 text-xs font-mono text-on-surface-variant">
              <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
              <span>{isPro ? 'Mesh Group Beam (Hingga 5 Perangkat)' : '1-to-1 Direct 5GHz P2P'}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={togglePause}
                disabled={activeTransfer.status !== 'streaming'}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface text-xs font-headline font-semibold transition-all active:scale-95 disabled:opacity-40"
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>
              <button
                onClick={cancelTransfer}
                disabled={activeTransfer.status !== 'streaming'}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-error-container/40 hover:bg-error-container text-error text-xs font-headline font-semibold transition-all active:scale-95 disabled:opacity-40"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Standby State */
        <div className="bg-surface-container rounded-2xl p-6 text-center border border-white/[0.04] space-y-2">
          <Film className="w-8 h-8 text-on-surface-variant mx-auto opacity-40" />
          <h3 className="font-headline text-sm font-semibold text-on-surface">Tidak ada transfer aktif</h3>
          <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
            Pilih atau seret file ke bawah untuk memulai streaming WebRTC langsung antar perangkat.
          </p>
        </div>
      )}

      {/* Chunk Matrix Telemetry */}
      <ChunkStreamMatrix />

      {/* Dropzone for new files */}
      <FileDropzone />
    </div>
  );
};
