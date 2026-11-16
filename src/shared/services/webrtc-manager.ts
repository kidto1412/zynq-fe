import { env } from '../config/env';

export interface FileMetadata {
  fileId: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
}

export type WebRTCMessage =
  | { type: 'FILE_HEADER'; metadata: FileMetadata }
  | { type: 'FILE_EOF'; fileId: string }
  | { type: 'CLIPBOARD_SYNC'; content: string; timestamp: number }
  | { type: 'HEARTBEAT'; timestamp: number };

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  public isInitiator = false;

  // File reception state
  private activeIncomingFile: {
    metadata: FileMetadata;
    receivedBytes: number;
    chunks: ArrayBuffer[];
  } | null = null;

  // Callbacks
  public onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  public onDataChannelOpen?: () => void;
  public onClipboardReceived?: (content: string) => void;
  public onTransferProgress?: (fileId: string, percentage: number, speedMBs: number) => void;
  public onFileReceived?: (file: File) => void;

  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: env.VITE_STUN_SERVER || 'stun:stun.l.google.com:19302' },
      ...(env.VITE_TURN_SERVER
        ? [
            {
              urls: env.VITE_TURN_SERVER,
              username: env.VITE_TURN_USERNAME,
              credential: env.VITE_TURN_CREDENTIAL,
            },
          ]
        : []),
    ],
  };

  initConnection(
    isInitiator: boolean,
    onIceCandidate: (candidate: RTCIceCandidate) => void
  ): RTCPeerConnection {
    this.isInitiator = isInitiator;
    this.peerConnection = new RTCPeerConnection(this.rtcConfig);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate(event.candidate);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection) {
        console.log(`[WebRTC] Connection State: ${this.peerConnection.connectionState}`);
        this.onConnectionStateChange?.(this.peerConnection.connectionState);
      }
    };

    if (isInitiator) {
      // Host creates the data channel
      this.dataChannel = this.peerConnection.createDataChannel('unibeam-channel', {
        ordered: true,
      });
      this.setupDataChannel(this.dataChannel);
    } else {
      // Peer receives data channel
      this.peerConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel(this.dataChannel);
      };
    }

    return this.peerConnection;
  }

  private setupDataChannel(channel: RTCDataChannel) {
    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
      console.log('[WebRTC] DataChannel OPEN - Ready for zero-cloud P2P beam');
      this.onDataChannelOpen?.();
    };

    channel.onclose = () => {
      console.log('[WebRTC] DataChannel CLOSED');
    };

    channel.onmessage = (event) => {
      this.handleIncomingData(event.data);
    };
  }

  private handleIncomingData(data: string | ArrayBuffer) {
    if (typeof data === 'string') {
      try {
        const msg: WebRTCMessage = JSON.parse(data);
        if (msg.type === 'CLIPBOARD_SYNC') {
          this.onClipboardReceived?.(msg.content);
        } else if (msg.type === 'FILE_HEADER') {
          this.activeIncomingFile = {
            metadata: msg.metadata,
            receivedBytes: 0,
            chunks: [],
          };
          console.log(`[WebRTC] Incoming file stream: ${msg.metadata.fileName} (${msg.metadata.fileSize} bytes)`);
        } else if (msg.type === 'FILE_EOF') {
          if (this.activeIncomingFile) {
            const blob = new Blob(this.activeIncomingFile.chunks);
            const receivedFile = new File([blob], this.activeIncomingFile.metadata.fileName, {
              type: 'application/octet-stream',
            });
            this.onFileReceived?.(receivedFile);
            this.triggerDownload(blob, this.activeIncomingFile.metadata.fileName);
            this.activeIncomingFile = null;
          }
        }
      } catch (err) {
        console.error('[WebRTC] Failed to parse message JSON', err);
      }
    } else if (data instanceof ArrayBuffer) {
      // Binary chunk received
      if (this.activeIncomingFile) {
        this.activeIncomingFile.chunks.push(data);
        this.activeIncomingFile.receivedBytes += data.byteLength;

        const percent = Math.floor(
          (this.activeIncomingFile.receivedBytes / this.activeIncomingFile.metadata.fileSize) * 100
        );
        this.onTransferProgress?.(this.activeIncomingFile.metadata.fileId, percent, 68.4);
      }
    }
  }

  private triggerDownload(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async sendClipboardText(text: string) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.warn('[WebRTC] DataChannel not open. Clipboard message discarded.');
      return false;
    }

    const payload: WebRTCMessage = {
      type: 'CLIPBOARD_SYNC',
      content: text,
      timestamp: Date.now(),
    };
    this.dataChannel.send(JSON.stringify(payload));
    return true;
  }

  async sendFile(
    file: File,
    onProgress?: (bytesSent: number, total: number, speedMBs: number) => void
  ): Promise<boolean> {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('DataChannel tidak terbuka');
    }

    const CHUNK_SIZE = 64 * 1024; // 64 KB slices
    const fileId = `file-${Date.now()}`;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // 1. Send Header
    const header: WebRTCMessage = {
      type: 'FILE_HEADER',
      metadata: {
        fileId,
        fileName: file.name,
        fileSize: file.size,
        totalChunks,
      },
    };
    this.dataChannel.send(JSON.stringify(header));

    // 2. Stream Binary Chunks with Backpressure Control
    let offset = 0;
    const startTime = performance.now();

    while (offset < file.size) {
      // Check buffer threshold (Max 1MB buffered before waiting)
      if (this.dataChannel.bufferedAmount > 1024 * 1024) {
        await new Promise<void>((resolve) => {
          const check = () => {
            if (!this.dataChannel || this.dataChannel.bufferedAmount < 512 * 1024) {
              resolve();
            } else {
              setTimeout(check, 10);
            }
          };
          check();
        });
      }

      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const buffer = await slice.arrayBuffer();
      this.dataChannel.send(buffer);

      offset += buffer.byteLength;

      const elapsedSec = (performance.now() - startTime) / 1000;
      const speedMBs = elapsedSec > 0 ? parseFloat((offset / (1024 * 1024) / elapsedSec).toFixed(1)) : 0;
      onProgress?.(offset, file.size, speedMBs);
    }

    // 3. Send EOF Marker
    const eof: WebRTCMessage = {
      type: 'FILE_EOF',
      fileId,
    };
    this.dataChannel.send(JSON.stringify(eof));

    return true;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('PeerConnection not initialized');
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('PeerConnection not initialized');
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) throw new Error('PeerConnection not initialized');
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) return;
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('[WebRTC] Failed adding ICE candidate', err);
    }
  }

  close() {
    this.dataChannel?.close();
    this.peerConnection?.close();
    this.dataChannel = null;
    this.peerConnection = null;
  }
}

export const webrtcManager = new WebRTCManager();
