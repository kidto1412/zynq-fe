import { create } from 'zustand';
import { TransferItem } from '../../domain/models/chunk.model';
import { webrtcManager } from '@/shared/services/webrtc-manager';
import { useAuthStore } from '@/features/auth/presentation/stores/useAuthStore';

interface TransferStore {
  activeTransfer: TransferItem | null;
  chunkBlocks: Array<{ id: number; status: 'completed' | 'active' | 'queued' }>;
  isPaused: boolean;
  error: string | null;

  // Actions
  togglePause: () => void;
  cancelTransfer: () => void;
  startRealFileTransfer: (file: File) => Promise<void>;
  startFolderTransfer: (filesWithPaths: { file: File; relativePath: string }[]) => Promise<void>;
  updateReceivedProgress: (fileId: string, percentage: number, speedMBs: number) => void;
}

const FREE_TIER_MAX_BYTES = 1024 * 1024 * 1024; // 1 GB limit for Free Tier

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

  webrtcManager.onFileReceived = (receivedFile, relativePath) => {
    set((state) => ({
      activeTransfer: state.activeTransfer
        ? {
            ...state.activeTransfer,
            status: 'completed',
            fileName: relativePath || receivedFile.name,
          }
        : null,
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
      const isPro = useAuthStore.getState().user?.plan === 'PRO_LIFETIME';

      // Enforce PRD Free Tier limit: 1 GB
      if (!isPro && file.size > FREE_TIER_MAX_BYTES) {
        set({
          error: `Ukuran file (${(file.size / (1024 * 1024 * 1024)).toFixed(2)} GB) melebihi batas 1 GB Free Tier. Upgrade ke ZYNQ Pro Lifetime untuk transfer tanpa batas!`,
        });
        return;
      }

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
          isFolder: false,
          isResumed: false,
        },
        chunkBlocks: Array.from({ length: 48 }).map((_, i) => ({
          id: i,
          status: i === 0 ? 'active' : 'queued',
        })),
        isPaused: false,
      });

      try {
        await webrtcManager.sendFile(file, (offset: number, total: number, speedMBs: number, isResumed?: boolean) => {
          const percent = Math.floor((offset / total) * 100);
          const activeIdx = Math.min(47, Math.floor((percent / 100) * 48));

          set((state) => ({
            activeTransfer: state.activeTransfer
              ? {
                  ...state.activeTransfer,
                  transferredBytes: offset,
                  speedMBs,
                  isResumed: isResumed ?? state.activeTransfer.isResumed,
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

    startFolderTransfer: async (filesWithPaths: { file: File; relativePath: string }[]) => {
      const isPro = useAuthStore.getState().user?.plan === 'PRO_LIFETIME';

      // Enforce PRD Section 9: Unlimited Folder / Directory Tree is Pro Lifetime
      if (!isPro) {
        set({
          error: 'Transfer Folder / Directory Tree adalah fitur eksklusif ZYNQ Pro Lifetime. Silakan upgrade untuk streaming struktur direktori utuh.',
        });
        return;
      }

      if (filesWithPaths.length === 0) return;

      const totalBatchSize = filesWithPaths.reduce((acc, curr) => acc + curr.file.size, 0);
      const totalFiles = filesWithPaths.length;
      const rootFolder = filesWithPaths[0].relativePath.split('/')[0] || 'Folder';

      set({
        error: null,
        activeTransfer: {
          id: `batch-${Date.now()}`,
          fileName: `${rootFolder} (${totalFiles} file)`,
          fileSize: totalBatchSize,
          transferredBytes: 0,
          speedMBs: 0,
          status: 'streaming',
          senderDevice: 'This Device',
          receiverDevice: 'Connected Peer',
          etaSeconds: 0,
          isFolder: true,
          relativePath: filesWithPaths[0].relativePath,
          batchIndex: 1,
          batchTotal: totalFiles,
          isResumed: false,
        },
        chunkBlocks: Array.from({ length: 48 }).map((_, i) => ({
          id: i,
          status: i === 0 ? 'active' : 'queued',
        })),
        isPaused: false,
      });

      try {
        let cumulativeTransferred = 0;

        for (let i = 0; i < totalFiles; i++) {
          const item = filesWithPaths[i];

          set((state) => ({
            activeTransfer: state.activeTransfer
              ? {
                  ...state.activeTransfer,
                  fileName: item.relativePath,
                  relativePath: item.relativePath,
                  batchIndex: i + 1,
                  batchTotal: totalFiles,
                }
              : null,
          }));

          await webrtcManager.sendFile(
            item.file,
            {
              relativePath: item.relativePath,
              isFolder: true,
              batchId: `batch-${Date.now()}`,
              batchIndex: i + 1,
              batchTotal: totalFiles,
            },
            (offset: number, _total: number, speedMBs: number, isResumed?: boolean) => {
              const currentOverallBytes = cumulativeTransferred + offset;
              const overallPercent = Math.min(100, Math.floor((currentOverallBytes / totalBatchSize) * 100));
              const activeIdx = Math.min(47, Math.floor((overallPercent / 100) * 48));

              set((state) => ({
                activeTransfer: state.activeTransfer
                  ? {
                      ...state.activeTransfer,
                      transferredBytes: currentOverallBytes,
                      speedMBs,
                      isResumed: isResumed ?? state.activeTransfer.isResumed,
                      etaSeconds:
                        speedMBs > 0
                          ? Math.ceil((totalBatchSize - currentOverallBytes) / (speedMBs * 1024 * 1024))
                          : 0,
                    }
                  : null,
                chunkBlocks: Array.from({ length: 48 }).map((_, idx) => ({
                  id: idx,
                  status: idx < activeIdx ? 'completed' : idx === activeIdx ? 'active' : 'queued',
                })),
              }));
            }
          );

          cumulativeTransferred += item.file.size;
        }

        set((state) => ({
          activeTransfer: state.activeTransfer
            ? {
                ...state.activeTransfer,
                status: 'completed',
                transferredBytes: totalBatchSize,
              }
            : null,
        }));
      } catch (err: any) {
        set({
          error: err.message || 'Gagal mentransfer folder via WebRTC DataChannel.',
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
