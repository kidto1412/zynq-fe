import { io, Socket } from 'socket.io-client';
import { env } from '../config/env';

export class SignalingService {
  private socket: Socket | null = null;
  public currentRoomId: string | null = null;

  connect(onConnect?: () => void): Socket {
    if (this.socket) {
      if (this.socket.connected && onConnect) {
        onConnect();
      } else if (onConnect) {
        this.socket.once('connect', onConnect);
      }
      return this.socket;
    }

    // Auto-detect production domain when VITE_WS_SIGNALING_URL still has localhost
    let signalingUrl = env.VITE_WS_SIGNALING_URL;
    if (
      typeof window !== 'undefined' &&
      !window.location.hostname.includes('localhost') &&
      !window.location.hostname.includes('127.0.0.1') &&
      signalingUrl.includes('localhost')
    ) {
      const proto = window.location.protocol === 'https:' ? 'https:' : 'http:';
      signalingUrl = `${proto}//${window.location.host}/signaling`;
    }

    this.socket = io(signalingUrl, {
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log(`[SignalingService] Connected to backend signaling: ${this.socket?.id}`);
      if (onConnect) onConnect();
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`[SignalingService] Disconnected: ${reason}`);
    });

    this.socket.on('connect_error', (err) => {
      console.warn(`[SignalingService] Connection error:`, err.message);
    });

    return this.socket;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  private async ensureConnected(): Promise<Socket> {
    const socket = this.connect();
    if (socket.connected) return socket;

    return new Promise((resolve, reject) => {
      if (socket.connected) {
        resolve(socket);
        return;
      }

      const onConn = () => {
        cleanup();
        resolve(socket);
      };

      const timer = setTimeout(() => {
        cleanup();
        if (socket.connected) {
          resolve(socket);
        } else {
          reject(new Error('Signaling connection timeout (12s)'));
        }
      }, 12000);

      const cleanup = () => {
        clearTimeout(timer);
        socket.off('connect', onConn);
      };

      socket.once('connect', onConn);
    });
  }

  async createRoom(deviceInfo: {
    deviceName: string;
    platform: string;
    publicKey: string;
    isPro?: boolean;
  }): Promise<{
    roomId: string;
    pin: string;
    qrPayload: string;
    maxPeers?: number;
  }> {
    const socket = await this.ensureConnected();

    return new Promise((resolve, reject) => {
      let resolved = false;

      const handleSuccess = (data: any) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        const payload = data?.data || data;
        this.currentRoomId = payload.roomId;
        resolve(payload);
      };

      const handleError = (err: any) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        reject(new Error(err?.message || 'Gagal membuat room'));
      };

      const timer = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        cleanup();
        reject(new Error('Room creation timeout'));
      }, 7000);

      const cleanup = () => {
        clearTimeout(timer);
        socket.off('room:created', handleSuccess);
        socket.off('room:error', handleError);
      };

      // Register listener before emitting
      socket.once('room:created', handleSuccess);
      socket.once('room:error', handleError);

      // Emit with ack support
      socket.emit('room:create', deviceInfo, (ack: any) => {
        if (ack) {
          handleSuccess(ack);
        }
      });
    });
  }

  async joinRoom(
    pin: string,
    deviceInfo: { deviceName: string; platform: string; publicKey: string }
  ): Promise<{ roomId: string; host: any }> {
    const socket = await this.ensureConnected();

    return new Promise((resolve, reject) => {
      let resolved = false;

      const handleSuccess = (res: any) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        const payload = res?.data || res;
        this.currentRoomId = payload.roomId;
        resolve(payload);
      };

      const handleError = (err: any) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        reject(new Error(err?.message || 'Gagal masuk ke room'));
      };

      const timer = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        cleanup();
        reject(new Error('Koneksi ke room timeout'));
      }, 7000);

      const cleanup = () => {
        clearTimeout(timer);
        socket.off('room:joined', handleSuccess);
        socket.off('room:error', handleError);
      };

      // Register listeners before emit
      socket.once('room:joined', handleSuccess);
      socket.once('room:error', handleError);

      // Emit with ack support
      socket.emit('room:join', { pin, ...deviceInfo }, (ack: any) => {
        if (ack) {
          if (ack.event === 'room:error' || ack.error) {
            handleError(ack.data || ack);
          } else {
            handleSuccess(ack);
          }
        }
      });
    });
  }

  sendOffer(targetClientId: string, sdp: RTCSessionDescriptionInit) {
    this.socket?.emit('webrtc:offer', { targetClientId, sdp });
  }

  sendAnswer(targetClientId: string, sdp: RTCSessionDescriptionInit) {
    this.socket?.emit('webrtc:answer', { targetClientId, sdp });
  }

  sendIceCandidate(targetClientId: string, candidate: RTCIceCandidateInit) {
    this.socket?.emit('webrtc:ice-candidate', { targetClientId, candidate });
  }

  onPeerJoined(callback: (payload: { peer: any; roomId: string }) => void) {
    this.socket?.on('room:peer-joined', callback);
  }

  onOffer(callback: (payload: { senderClientId: string; sdp: RTCSessionDescriptionInit }) => void) {
    this.socket?.on('webrtc:offer', callback);
  }

  onAnswer(callback: (payload: { senderClientId: string; sdp: RTCSessionDescriptionInit }) => void) {
    this.socket?.on('webrtc:answer', callback);
  }

  onIceCandidate(callback: (payload: { senderClientId: string; candidate: RTCIceCandidateInit }) => void) {
    this.socket?.on('webrtc:ice-candidate', callback);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.currentRoomId = null;
  }
}

export const signalingService = new SignalingService();
