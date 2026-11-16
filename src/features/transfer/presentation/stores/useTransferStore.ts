import { create } from 'zustand';
import { TransferItem } from '../../domain/models/chunk.model';
import { webrtcManager } from '@/shared/services/webrtc-manager';

interface TransferStore {
  activeTransfer: TransferItem | null;
  chunkBlocks: Array<{ id: number; status: 'completed' | 'active' | 'queued' }>;
  isPaused: boolean;
  error: string | null;

  // Actions
  togglePause: () => void;
  cancelTransfer: () => void;
  startRealFileTransfer: (file: File) => Promise<void>;
  updateReceivedProgress: (fileId: string, percentage: number, speedMBs: number) => void;
}

export const useTransferStore = create<TransferStore>((set) => {
  // Wire real WebRTC file reception events
  webrtcManager.onTransferProgress = (fileId, percentage, speedMBs) => {
    const activeIdx = Math.min(47, Math.floor((percentage / 100) * 48));
    set((state) => ({
      activeTransfer: state.activeTransfer
        ? {
            ...state.activeTransfer,
            id: fileId,
            speedMBs,
            status: percentage >= 100 ? 'completed' : 'streaming',
          }
        : null,
      chunkBlocks: Array.from({ length: 48 }).map((_, i) => ({
        id: i,
        status: i < activeIdx ? 'completed' : i === activeIdx ? 'active' : 'queued',
      })),
    }));
  };

  return {
    activeTransfer: null,
    chunkBlocks: Array.from({ length: 48 }).map((_, i) => ({
      id: i,
      status: 'queued',
    })),
    isPaused: false,
    error: null,

    togglePause: () => {
      set((state) => ({ isPaused: !state.isPaused }));
    },

    cancelTransfer: () => {
      set((state) => ({
        activeTransfer: state.activeTransfer
          ? {
              ...state.activeTransfer,
              status: 'canceled',
            }
          : null,
      }));
    },

    startRealFileTransfer: async (file: File) => {
      set({
        error: null,
        activeTransfer: {
          id: `tx-${Date.now()}`,
          fileName: file.name,
          fileSize: file.size,
          transferredBytes: 0,
          speedMBs: 0,
          status: 'streaming',
          senderDevice: 'This Device',
          receiverDevice: 'Connected Peer',
          etaSeconds: 0,
        },
        chunkBlocks: Array.from({ length: 48 }).map((_, i) => ({
          id: i,
          status: i === 0 ? 'active' : 'queued',
        })),
        isPaused: false,
      });

      try {
        await webrtcManager.sendFile(file, (offset, total, speedMBs) => {
          const percent = Math.floor((offset / total) * 100);
          const activeIdx = Math.min(47, Math.floor((percent / 100) * 48));

          set((state) => ({
            activeTransfer: state.activeTransfer
              ? {
                  ...state.activeTransfer,
                  transferredBytes: offset,
                  speedMBs,
                  status: offset >= total ? 'completed' : 'streaming',
                  etaSeconds: speedMBs > 0 ? Math.ceil((total - offset) / (speedMBs * 1024 * 1024)) : 0,
                }
              : null,
            chunkBlocks: Array.from({ length: 48 }).map((_, i) => ({
              id: i,
              status: i < activeIdx ? 'completed' : i === activeIdx ? 'active' : 'queued',
            })),
          }));
        });
      } catch (err: any) {
        set({
          error: err.message || 'WebRTC DataChannel belum terhubung. Silakan pasangkan perangkat via Radar terlebih dahulu.',
          activeTransfer: null,
        });
      }
    },

    updateReceivedProgress: (fileId: string, percentage: number, speedMBs: number) => {
      const activeIdx = Math.min(47, Math.floor((percentage / 100) * 48));
      set((state) => ({
        activeTransfer: state.activeTransfer
          ? {
              ...state.activeTransfer,
              id: fileId,
              speedMBs,
              status: percentage >= 100 ? 'completed' : 'streaming',
            }
          : null,
        chunkBlocks: Array.from({ length: 48 }).map((_, i) => ({
          id: i,
          status: i < activeIdx ? 'completed' : i === activeIdx ? 'active' : 'queued',
        })),
      }));
    },
  };
});
