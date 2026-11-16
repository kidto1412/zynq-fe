import React from 'react';
import { useTransferStore } from '../stores/useTransferStore';

export const ChunkStreamMatrix: React.FC = () => {
  const { chunkBlocks } = useTransferStore();

  return (
    <div className="bg-surface-container rounded-2xl p-4 border border-white/[0.04] space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-headline text-xs font-bold text-on-surface uppercase tracking-wider">
            WebRTC SCTP Chunk Stream (64KB Slices)
          </span>
        </div>
        <span className="font-mono text-xs text-on-surface-variant">48 Chunks In Flight</span>
      </div>

      <div className="grid grid-cols-12 gap-1.5 p-2 bg-surface-container-lowest rounded-xl border border-white/[0.03]">
        {chunkBlocks.map((chunk) => (
          <div
            key={chunk.id}
            className={`h-4 rounded-xs transition-all duration-300 ${
              chunk.status === 'completed'
                ? 'bg-secondary'
                : chunk.status === 'active'
                ? 'bg-primary animate-pulse shadow-[0_0_8px_rgba(76,215,246,0.8)]'
                : 'bg-surface-container-high/40'
            }`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant pt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-xs bg-secondary" />
          <span>Verified ACK</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-xs bg-primary" />
          <span>Streaming Buffer</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-xs bg-surface-container-high/60" />
          <span>Queued</span>
        </div>
      </div>
    </div>
  );
};
