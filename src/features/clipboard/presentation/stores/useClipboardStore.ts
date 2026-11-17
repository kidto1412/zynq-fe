import { create } from 'zustand';
import type { ClipboardItem } from '../../domain/models/clipboard-item.model';
import { webrtcManager } from '@/shared/services/webrtc-manager';
import { api } from '@/shared/services/api';
import { useAuthStore } from '@/features/auth/presentation/stores/useAuthStore';
import { encryptZeroKnowledge, decryptZeroKnowledge } from '@/shared/lib/crypto-payload';

interface ClipboardStore {
  autoSync: boolean;
  activeItem: ClipboardItem | null;
  historyItems: ClipboardItem[];
  isSyncingVault: boolean;

  // Actions
  toggleAutoSync: () => void;
  sendToPeer: () => Promise<void>;
  clearActiveBuffer: () => void;
  addNewItem: (content: string, type?: ClipboardItem['type'], mimeType?: string) => Promise<void>;
  readLocalClipboard: () => Promise<void>;
  copyToLocalClipboard: (content: string) => Promise<boolean>;
  loadVaultHistory: (userId?: string) => Promise<void>;
  panicPurgeVault: () => Promise<number>;
}

export const useClipboardStore = create<ClipboardStore>((set, get) => {
  // Real WebRTC Text clipboard reception
  webrtcManager.onClipboardReceived = (content: string) => {
    const isUrl = content.startsWith('http://') || content.startsWith('https://');
    const receivedItem: ClipboardItem = {
      id: `clip-${Date.now()}`,
      type: isUrl ? 'url' : 'text',
      content,
      sourceDevice: 'Peer Device',
      timestamp: 'Diterima barusan',
      byteSize: `${content.length} B`,
    };

    set((state) => ({
      activeItem: receivedItem,
      historyItems: [receivedItem, ...state.historyItems],
    }));

    if (get().autoSync && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(content).catch(() => {});
    }
  };

  // Real WebRTC Image clipboard reception (PNG / JPEG Blob)
  webrtcManager.onClipboardImageReceived = (dataUrl: string, mimeType: string, size: number) => {
    const receivedItem: ClipboardItem = {
      id: `clip-${Date.now()}`,
      type: 'image',
      content: dataUrl,
      sourceDevice: 'Peer Device',
      timestamp: 'Gambar Diterima barusan',
      byteSize: `${(size / 1024).toFixed(1)} KB`,
      mimeType,
    };

    set((state) => ({
      activeItem: receivedItem,
      historyItems: [receivedItem, ...state.historyItems],
    }));
  };

  return {
    autoSync: true,
    activeItem: null,
    historyItems: [],
    isSyncingVault: false,

    toggleAutoSync: () => set((state) => ({ autoSync: !state.autoSync })),

    sendToPeer: async () => {
      const { activeItem, historyItems } = get();
      if (!activeItem) return;

      // 1. Send via real WebRTC DataChannel (Group Beam / 1-to-1)
      if (activeItem.type === 'image') {
        await webrtcManager.sendClipboardImage(activeItem.content, activeItem.mimeType || 'image/png');
      } else {
        await webrtcManager.sendClipboardText(activeItem.content);
      }

      // 2. PRD Keamanan Clipboard: Free Tier is strictly RAM-only!
      const user = useAuthStore.getState().user;
      const isPro = user?.plan === 'PRO_LIFETIME';

      if (isPro && user?.id) {
        // Zero-Knowledge Client-Side Encryption before sending to Cloud Vault
        try {
          set({ isSyncingVault: true });
          const { encryptedData, iv } = await encryptZeroKnowledge(activeItem.content);

          await api.syncVault({
            userId: user.id,
            sourceDevice: activeItem.sourceDevice,
            contentType: activeItem.type,
            encryptedData,
            iv,
            byteSize: activeItem.content.length,
          });
        } catch (err) {
          console.warn('[ClipboardStore] Backend zero-knowledge vault sync error:', err);
        } finally {
          set({ isSyncingVault: false });
        }
      }

      set({
        historyItems: [
          {
            ...activeItem,
            id: `clip-${Date.now()}`,
            timestamp: 'Terkirim barusan',
          },
          ...historyItems,
        ],
      });
    },

    clearActiveBuffer: () => set({ activeItem: null }),

    readLocalClipboard: async () => {
      try {
        // 1. Try reading Rich Clipboard (Images / Screenshots)
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.read) {
          try {
            const clipboardItems = await navigator.clipboard.read();
            for (const item of clipboardItems) {
              if (item.types.includes('image/png') || item.types.includes('image/jpeg')) {
                const mimeType = item.types.includes('image/png') ? 'image/png' : 'image/jpeg';
                const blob = await item.getType(mimeType);
                const reader = new FileReader();
                reader.onload = async () => {
                  const dataUrl = reader.result as string;
                  const newItem: ClipboardItem = {
                    id: `clip-${Date.now()}`,
                    type: 'image',
                    content: dataUrl,
                    sourceDevice: 'This Device (You)',
                    timestamp: 'Screenshot Disalin barusan',
                    byteSize: `${(blob.size / 1024).toFixed(1)} KB`,
                    mimeType,
                  };

                  set((state) => ({
                    activeItem: newItem,
                    historyItems: [newItem, ...state.historyItems],
                  }));

                  // Transmit over WebRTC DataChannel (1-to-Many Group Beam / 1-to-1)
                  await webrtcManager.sendClipboardImage(dataUrl, mimeType, blob.size);
                };
                reader.readAsDataURL(blob);
                return;
              }
            }
          } catch {
            // navigator.clipboard.read not supported or permission denied
          }
        }

        // 2. Fallback to Text Clipboard
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          if (text) {
            await get().addNewItem(text);
          }
        }
      } catch (err) {
        console.warn('[ClipboardStore] Clipboard read permission denied or unavailable:', err);
      }
    },

    addNewItem: async (content, type = 'text', mimeType) => {
      const isUrl = content.startsWith('http://') || content.startsWith('https://');
      const isImage = content.startsWith('data:image/');
      const resolvedType = isImage ? 'image' : isUrl ? 'url' : type;

      const newItem: ClipboardItem = {
        id: `clip-${Date.now()}`,
        type: resolvedType,
        content,
        sourceDevice: 'This Device (You)',
        timestamp: 'Disalin barusan',
        byteSize: `${(content.length / 1024).toFixed(1)} KB`,
        mimeType: mimeType || (isImage ? 'image/png' : undefined),
      };

      set((state) => ({
        activeItem: newItem,
        historyItems: [newItem, ...state.historyItems],
      }));

      // Broadcast immediately across open WebRTC DataChannels (Group Beam / 1-to-1)
      if (resolvedType === 'image') {
        await webrtcManager.sendClipboardImage(content, newItem.mimeType);
      } else {
        await webrtcManager.sendClipboardText(content);
      }

      // Pro Tier: Persist to Zero-Knowledge Vault
      const user = useAuthStore.getState().user;
      const isPro = user?.plan === 'PRO_LIFETIME';

      if (isPro && user?.id) {
        try {
          const { encryptedData, iv } = await encryptZeroKnowledge(content);
          await api.syncVault({
            userId: user.id,
            sourceDevice: 'This Device',
            contentType: resolvedType,
            encryptedData,
            iv,
            byteSize: content.length,
          });
        } catch {
          // Vault persist optional
        }
      }
    },

    copyToLocalClipboard: async (content: string) => {
      try {
        if (content.startsWith('data:image/')) {
          const res = await fetch(content);
          const blob = await res.blob();
          if (navigator.clipboard && navigator.clipboard.write) {
            await navigator.clipboard.write([new ClipboardItem({ [blob.type || 'image/png']: blob })]);
            return true;
          }
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(content);
          return true;
        }
        return false;
      } catch (err) {
        console.warn('[ClipboardStore] Copy to clipboard failed:', err);
        return false;
      }
    },

    loadVaultHistory: async (userId) => {
      const targetUserId = userId || useAuthStore.getState().user?.id;
      if (!targetUserId) return;

      const user = useAuthStore.getState().user;
      if (user?.plan !== 'PRO_LIFETIME') {
        // Free tier is strictly RAM-only
        return;
      }

      try {
        const res = await api.getVaultHistory(targetUserId);
        if (res.success && Array.isArray(res.data)) {
          const mapped: ClipboardItem[] = await Promise.all(
            res.data.map(async (entry: any) => {
              const decryptedContent = await decryptZeroKnowledge(entry.encryptedData, entry.iv);
              return {
                id: entry.id,
                type: entry.contentType as ClipboardItem['type'],
                content: decryptedContent,
                sourceDevice: entry.sourceDevice || 'Zero-Knowledge Vault',
                timestamp: new Date(entry.createdAt).toLocaleTimeString(),
                byteSize: `${entry.byteSize || 0} B`,
              };
            })
          );

          set((state) => ({
            historyItems: [...mapped, ...state.historyItems.filter((i) => !mapped.some((m) => m.id === i.id))],
          }));
        }
      } catch (err) {
        console.warn('[ClipboardStore] Could not load zero-knowledge vault history:', err);
      }
    },

    panicPurgeVault: async () => {
      const user = useAuthStore.getState().user;
      if (!user?.id) {
        set({ historyItems: [], activeItem: null });
        return 0;
      }

      try {
        const res = await api.panicPurgeVault(user.id);
        set({ historyItems: [], activeItem: null });
        return res.purgedCount || 0;
      } catch {
        set({ historyItems: [], activeItem: null });
        return 0;
      }
    },
  };
});
