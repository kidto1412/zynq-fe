import { create } from 'zustand';
import { ClipboardItem } from '../../domain/models/clipboard-item.model';
import { webrtcManager } from '@/shared/services/webrtc-manager';
import { api } from '@/shared/services/api';

interface ClipboardStore {
  autoSync: boolean;
  activeItem: ClipboardItem | null;
  historyItems: ClipboardItem[];
  isSyncingVault: boolean;

  // Actions
  toggleAutoSync: () => void;
  sendToPeer: () => Promise<void>;
  clearActiveBuffer: () => void;
  addNewItem: (content: string, type?: ClipboardItem['type']) => Promise<void>;
  readLocalClipboard: () => Promise<void>;
  copyToLocalClipboard: (content: string) => Promise<boolean>;
  loadVaultHistory: (userId?: string) => Promise<void>;
}

export const useClipboardStore = create<ClipboardStore>((set, get) => {
  // Real WebRTC clipboard reception
  webrtcManager.onClipboardReceived = (content: string) => {
    const isUrl = content.startsWith('http://') || content.startsWith('https://');
    const receivedItem: ClipboardItem = {
      id: `clip-${Date.now()}`,
      type: isUrl ? 'url' : 'text',
      content,
      sourceDevice: 'Peer Device',
      timestamp: 'Diterima barusan',
    };

    set((state) => ({
      activeItem: receivedItem,
      historyItems: [receivedItem, ...state.historyItems],
    }));

    if (get().autoSync && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(content).catch(() => {});
    }
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

      // 1. Send via real WebRTC DataChannel
      await webrtcManager.sendClipboardText(activeItem.content);

      // 2. Persist to real NestJS PostgreSQL Vault
      try {
        set({ isSyncingVault: true });
        await api.syncVault({
          userId: 'default-user',
          sourceDevice: activeItem.sourceDevice,
          contentType: activeItem.type,
          encryptedData: btoa(activeItem.content),
          iv: 'aes-gcm-iv',
          byteSize: activeItem.content.length,
        });
      } catch (err) {
        console.warn('[ClipboardStore] Backend vault sync error:', err);
      } finally {
        set({ isSyncingVault: false });
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
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          if (text) {
            await get().addNewItem(text);
          }
        }
      } catch (err) {
        console.warn('[ClipboardStore] Clipboard read permission denied or unavailable:', err);
      }
    },

    addNewItem: async (content, type = 'text') => {
      const isUrl = content.startsWith('http://') || content.startsWith('https://');
      const resolvedType = isUrl ? 'url' : type;

      const newItem: ClipboardItem = {
        id: `clip-${Date.now()}`,
        type: resolvedType,
        content,
        sourceDevice: 'This Device (You)',
        timestamp: 'Disalin barusan',
      };

      set((state) => ({
        activeItem: newItem,
        historyItems: [newItem, ...state.historyItems],
      }));

      // Broadcast immediately across open WebRTC DataChannel
      await webrtcManager.sendClipboardText(content);

      // Persist to backend vault
      try {
        await api.syncVault({
          userId: 'default-user',
          sourceDevice: 'This Device',
          contentType: resolvedType,
          encryptedData: btoa(content),
          iv: 'aes-gcm-iv',
          byteSize: content.length,
        });
      } catch {
        // Soft fail if DB is offline
      }
    },

    copyToLocalClipboard: async (content: string) => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(content);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },

    loadVaultHistory: async (userId = 'default-user') => {
      try {
        const res = await api.getVaultHistory(userId);
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const mapped: ClipboardItem[] = res.data.map((entry: any) => ({
            id: entry.id,
            type: entry.contentType as any,
            content: atob(entry.encryptedData || ''),
            sourceDevice: entry.sourceDevice,
            timestamp: new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }));
          set({ historyItems: mapped });
        }
      } catch {
        // Soft fail
      }
    },
  };
});
