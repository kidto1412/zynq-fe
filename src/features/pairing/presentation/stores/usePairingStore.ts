import { create } from 'zustand';
import { DevicePeer } from '../../domain/models/pairing-session.model';
import { signalingService } from '@/shared/services/signaling-service';
import { webrtcManager } from '@/shared/services/webrtc-manager';
import { getLocalDeviceInfo } from '@/shared/lib/device-detector';
import { api } from '@/shared/services/api';
import { useAuthStore } from '@/features/auth/presentation/stores/useAuthStore';

interface PairingStore {
  currentDevice: DevicePeer;
  nearbyPeers: DevicePeer[];
  selectedPeer: DevicePeer | null;
  activeTunnelPeer: DevicePeer | null;
  connectionStatus: 'idle' | 'broadcasting' | 'handshake' | 'connected' | 'error';
  isQrModalOpen: boolean;
  activePin: string;
  activeRoomId: string | null;
  qrPayload: string | null;
  airdropEmulation: boolean;
  isCreatingRoom: boolean;
  errorMessage: string | null;

  // Actions
  initializeSocket: () => void;
  createRealRoom: () => Promise<void>;
  joinRealRoom: (pin: string) => Promise<void>;
  selectPeer: (peer: DevicePeer) => void;
  setConnectionStatus: (status: PairingStore['connectionStatus']) => void;
  setQrModalOpen: (open: boolean) => void;
  setActiveTunnelPeer: (peer: DevicePeer | null) => void;
  toggleAirdrop: () => void;
  triggerBeam: (peer: DevicePeer) => void;
}

const localInfo = getLocalDeviceInfo();
let isSocketInitialized = false;

export const usePairingStore = create<PairingStore>((set, get) => ({
  currentDevice: {
    id: localInfo.deviceId,
    name: `${localInfo.deviceName} (You)`,
    model: localInfo.osVersion,
    platform: localInfo.platform,
    signal: '100%',
    isOnline: true,
    ip: 'WebRTC Host · Local Subnet',
    fingerprint: localInfo.deviceId.substring(0, 14).toUpperCase(),
  },
  nearbyPeers: [], // Pure dynamic peers
  selectedPeer: null,
  activeTunnelPeer: null,
  connectionStatus: 'idle',
  isQrModalOpen: false,
  activePin: '------',
  activeRoomId: null,
  qrPayload: null,
  airdropEmulation: true,
  isCreatingRoom: false,
  errorMessage: null,

  initializeSocket: () => {
    if (isSocketInitialized) return;
    isSocketInitialized = true;

    const { currentDevice } = get();

    // Register this real device in PostgreSQL backend
    api.registerDevice({
      deviceId: currentDevice.id,
      deviceName: currentDevice.name,
      platform: currentDevice.platform,
      publicKey: currentDevice.fingerprint,
      userId: 'default-user',
    }).catch(() => {});

    // Connect to NestJS WebSocket Signaling Gateway
    signalingService.connect(() => {
      set({ connectionStatus: 'broadcasting' });
      get().createRealRoom();
    });

    // Listen for WebRTC Signaling events
    signalingService.onPeerJoined(async ({ peer }) => {
      console.log('[Signaling] Real peer connected to room:', peer);
      const newPeer: DevicePeer = {
        id: peer.clientId,
        name: peer.deviceName,
        model: peer.platform,
        platform: peer.platform,
        signal: '98%',
        isOnline: true,
        fingerprint: peer.publicKey || 'E2EE·PEER',
      };

      set((state) => ({
        connectionStatus: 'handshake',
        activeTunnelPeer: newPeer,
        selectedPeer: newPeer,
        nearbyPeers: [newPeer, ...state.nearbyPeers.filter((p) => p.id !== newPeer.id)],
      }));

      // Host initiates WebRTC Offer
      webrtcManager.initConnection(true, (candidate) => {
        signalingService.sendIceCandidate(peer.clientId, candidate);
      });

      webrtcManager.onDataChannelOpen = () => {
        set({ connectionStatus: 'connected' });
      };

      const offer = await webrtcManager.createOffer();
      signalingService.sendOffer(peer.clientId, offer);
    });

    signalingService.onOffer(async ({ senderClientId, sdp }) => {
      console.log('[Signaling] Received WebRTC offer from host:', senderClientId);
      set({ connectionStatus: 'handshake' });

      webrtcManager.initConnection(false, (candidate) => {
        signalingService.sendIceCandidate(senderClientId, candidate);
      });

      webrtcManager.onDataChannelOpen = () => {
        set({ connectionStatus: 'connected' });
      };

      const answer = await webrtcManager.handleOffer(sdp);
      signalingService.sendAnswer(senderClientId, answer);
    });

    signalingService.onAnswer(async ({ sdp }) => {
      console.log('[Signaling] Received WebRTC answer from peer');
      await webrtcManager.handleAnswer(sdp);
    });

    signalingService.onIceCandidate(async ({ candidate }) => {
      await webrtcManager.addIceCandidate(candidate);
    });
  },

  createRealRoom: async () => {
    const { currentDevice } = get();
    const isPro = useAuthStore.getState().user?.plan === 'PRO_LIFETIME';
    set({ isCreatingRoom: true, errorMessage: null });
    try {
      const room = await signalingService.createRoom({
        deviceName: currentDevice.name,
        platform: currentDevice.platform,
        publicKey: currentDevice.fingerprint,
        isPro,
      });

      set({
        activePin: room.pin,
        activeRoomId: room.roomId,
        qrPayload: room.qrPayload,
        connectionStatus: 'broadcasting',
        isCreatingRoom: false,
        errorMessage: null,
      });
    } catch (err: any) {
      console.warn('[Signaling] Failed to create room on backend:', err.message);
      set({
        activePin: '------',
        activeRoomId: null,
        isCreatingRoom: false,
        errorMessage: err.message || 'Koneksi ke backend signaling gagal. Periksa koneksi atau coba lagi.',
      });
    }
  },

  joinRealRoom: async (pin: string) => {
    const { currentDevice } = get();
    set({ connectionStatus: 'handshake', errorMessage: null });

    try {
      const res = await signalingService.joinRoom(pin, {
        deviceName: currentDevice.name,
        platform: currentDevice.platform,
        publicKey: currentDevice.fingerprint,
      });

      const hostPeer: DevicePeer = {
        id: res.host.clientId,
        name: res.host.deviceName,
        model: res.host.platform,
        platform: res.host.platform,
        signal: '99%',
        isOnline: true,
        fingerprint: res.host.publicKey || 'HOST·E2EE',
      };

      set((state) => ({
        activeRoomId: res.roomId,
        activeTunnelPeer: hostPeer,
        selectedPeer: hostPeer,
        nearbyPeers: [hostPeer, ...state.nearbyPeers.filter((p) => p.id !== hostPeer.id)],
        connectionStatus: 'connected',
      }));
    } catch (err: any) {
      set({ connectionStatus: 'error', errorMessage: err.message });
      throw err;
    }
  },

  selectPeer: (peer) => set({ selectedPeer: peer }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setQrModalOpen: (open) => set({ isQrModalOpen: open }),
  setActiveTunnelPeer: (peer) => set({ activeTunnelPeer: peer }),
  toggleAirdrop: () => set((state) => ({ airdropEmulation: !state.airdropEmulation })),
  triggerBeam: (peer) => {
    set({ connectionStatus: 'handshake', selectedPeer: peer });
  },
}));
