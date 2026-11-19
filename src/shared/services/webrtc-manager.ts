import { env } from '../config/env';

export interface FileMetadata {
  fileId: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  relativePath?: string;
  isFolder?: boolean;
  batchId?: string;
  batchIndex?: number;
  batchTotal?: number;
}

export type WebRTCMessage =
  | { type: 'FILE_HEADER'; metadata: FileMetadata }
  | { type: 'FILE_RESUME_REQUEST'; fileId: string; resumeOffset: number }
  | { type: 'FILE_EOF'; fileId: string }
  | { type: 'CLIPBOARD_SYNC'; content: string; timestamp: number }
  | { type: 'CLIPBOARD_IMAGE'; mimeType: string; dataUrl: string; size: number; timestamp: number }
  | { type: 'HEARTBEAT'; timestamp: number };

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private peerChannels: Map<string, RTCDataChannel> = new Map();
  public isInitiator = false;

  // Active file reception state
  private activeIncomingFile: {
    metadata: FileMetadata;
    receivedBytes: number;
    chunks: ArrayBuffer[];
  } | null = null;

  // Resumable transfer ledger (survives transient disconnects)
  private transferLedger = new Map<
    string,
    {
      metadata: FileMetadata;
      receivedBytes: number;
      chunks: ArrayBuffer[];
    }
  >();

  // Sender resume signals
  private pendingResumeOffset: { [fileId: string]: number } = {};

  // Callbacks
  public onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  public onDataChannelOpen?: () => void;
  public onClipboardReceived?: (content: string) => void;
  public onClipboardImageReceived?: (dataUrl: string, mimeType: string, size: number) => void;
  public onTransferProgress?: (fileId: string, percentage: number, speedMBs: number, isResumed?: boolean) => void;
  public onFileReceived?: (file: File, relativePath?: string) => void;
  public onPeersCountChange?: (count: number) => void;

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
      this.dataChannel = this.peerConnection.createDataChannel('zynq-channel', {
        ordered: true,
      });
      this.setupDataChannel(this.dataChannel);
    } else {
      this.peerConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel(this.dataChannel);
      };
    }

    return this.peerConnection;
  }

  /**
   * Offline Hotspot Direct Mode Initialization
   * Uses empty iceServers list to bypass all STUN/TURN queries.
   * Gathers local subnet host candidates immediately without internet.
   */
  initHotspotConnection(isInitiator: boolean): RTCPeerConnection {
    this.isInitiator = isInitiator;
    this.peerConnection = new RTCPeerConnection({ iceServers: [] });

    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection) {
        console.log(`[WebRTC Hotspot] Connection State: ${this.peerConnection.connectionState}`);
        this.onConnectionStateChange?.(this.peerConnection.connectionState);
      }
    };

    if (isInitiator) {
      this.dataChannel = this.peerConnection.createDataChannel('zynq-hotspot-channel', {
        ordered: true,
      });
      this.setupDataChannel(this.dataChannel, 'hotspot-peer');
    } else {
      this.peerConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel(this.dataChannel, 'hotspot-peer');
      };
    }

    return this.peerConnection;
  }

  /**
   * Cleans and compresses raw WebRTC SDP for Hotspot QR code transmission.
   * Strips non-essential extensions and keeps only local IPv4 UDP host candidates,
   * significantly reducing payload size to produce a readable, low-density QR code.
   */
  private cleanSdpForHotspot(rawSdp: string): string {
    const lines = rawSdp.split(/\r?\n/);
    const result: string[] = [];
    const seenCandidates = new Set<string>();

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      if (line.startsWith('a=candidate:')) {
        // Keep only UDP candidates
        if (!line.includes(' udp ')) continue;

        // Skip IPv6 candidates to save crucial QR density space
        const parts = line.split(' ');
        const ip = parts[4];
        if (ip && ip.includes(':')) continue;

        // Skip loopback / dummy candidates
        if (ip === '127.0.0.1' || ip === '0.0.0.0') continue;

        // Deduplicate
        if (seenCandidates.has(line)) continue;
        seenCandidates.add(line);
      }

      // Strip non-essential lines that take up valuable QR space
      if (
        line.startsWith('a=extmap:') ||
        line.startsWith('a=extmap-allow-mixed') ||
        line.startsWith('a=msid-semantic:') ||
        line.startsWith('a=ice-options:trickle') ||
        line.startsWith('a=rtcp-mux') ||
        line.startsWith('a=rtcp-rsize')
      ) {
        continue;
      }

      result.push(line);
    }

    return result.join('\r\n') + '\r\n';
  }

  /**
   * Listens for ICE candidate gathering and ensures host candidates are embedded into SDP.
   */
  private async waitForIceCandidates(pc: RTCPeerConnection, timeoutMs = 2500): Promise<string> {
    const gatheredCandidates: string[] = [];

    await new Promise<void>((resolve) => {
      let isResolved = false;
      const finish = () => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          resolve();
        }
      };

      const onCandidate = (event: RTCPeerConnectionIceEvent) => {
        if (event.candidate) {
          gatheredCandidates.push(event.candidate.candidate);
        } else {
          // Gathering complete (event.candidate === null)
          finish();
        }
      };

      const onStateChange = () => {
        if (pc.iceGatheringState === 'complete') {
          finish();
        }
      };

      const timer = setTimeout(finish, timeoutMs);

      const cleanup = () => {
        clearTimeout(timer);
        pc.removeEventListener('icecandidate', onCandidate);
        pc.removeEventListener('icegatheringstatechange', onStateChange);
      };

      pc.addEventListener('icecandidate', onCandidate);
      pc.addEventListener('icegatheringstatechange', onStateChange);

      if (pc.iceGatheringState === 'complete') {
        finish();
      }
    });

    let sdp = pc.localDescription?.sdp || '';
    if (gatheredCandidates.length > 0) {
      for (const cand of gatheredCandidates) {
        if (!sdp.includes(cand)) {
          sdp += `a=${cand}\r\n`;
        }
      }
    }

    return this.cleanSdpForHotspot(sdp);
  }

  async createHotspotOffer(): Promise<string> {
    this.initHotspotConnection(true);
    if (!this.peerConnection) throw new Error('PeerConnection not initialized');

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    const sdp = await this.waitForIceCandidates(this.peerConnection, 2500);
    return sdp || offer.sdp || '';
  }

  async handleHotspotOffer(offerSdp: string): Promise<string> {
    this.initHotspotConnection(false);
    if (!this.peerConnection) throw new Error('PeerConnection not initialized');

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: offerSdp }));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    const sdp = await this.waitForIceCandidates(this.peerConnection, 2500);
    return sdp || answer.sdp || '';
  }

  async handleHotspotAnswer(answerSdp: string): Promise<void> {
    if (!this.peerConnection) throw new Error('PeerConnection not initialized');
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answerSdp }));
  }


  public registerMeshPeer(peerId: string, channel: RTCDataChannel) {
    this.peerChannels.set(peerId, channel);
    this.setupDataChannel(channel, peerId);
  }

  public getConnectedPeersCount(): number {
    let count = 0;
    if (this.dataChannel && this.dataChannel.readyState === 'open') count++;
    for (const [_, ch] of this.peerChannels) {
      if (ch !== this.dataChannel && ch.readyState === 'open') count++;
    }
    return count;
  }

  public broadcastMessage(data: string | ArrayBuffer): boolean {
    let sent = false;
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(data as any);
        sent = true;
      } catch {}
    }
    for (const [_, ch] of this.peerChannels) {
      if (ch !== this.dataChannel && ch.readyState === 'open') {
        try {
          ch.send(data as any);
          sent = true;
        } catch {}
      }
    }
    return sent;
  }

  private setupDataChannel(channel: RTCDataChannel, peerId?: string) {
    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
      console.log(`[WebRTC] DataChannel OPEN (Mesh Node: ${peerId || 'primary'})`);
      if (peerId) this.peerChannels.set(peerId, channel);
      this.onDataChannelOpen?.();
      this.onPeersCountChange?.(this.getConnectedPeersCount());
    };

    channel.onclose = () => {
      console.log(`[WebRTC] DataChannel CLOSED (${peerId || 'primary'})`);
      if (peerId) this.peerChannels.delete(peerId);
      this.onPeersCountChange?.(this.getConnectedPeersCount());
    };

    channel.onmessage = (event) => {
      this.handleIncomingData(event.data);
    };
  }

  private handleIncomingData(data: string | ArrayBuffer) {
    if (typeof data === 'string') {
      try {
        const msg: WebRTCMessage = JSON.parse(data);

        // 1. Text Clipboard Sync
        if (msg.type === 'CLIPBOARD_SYNC') {
          this.onClipboardReceived?.(msg.content);
        }

        // 2. Image / Screenshot Blob Clipboard Sync (PNG)
        else if (msg.type === 'CLIPBOARD_IMAGE') {
          console.log(`[WebRTC] Incoming clipboard image: ${msg.mimeType} (${msg.size} bytes)`);
          this.onClipboardImageReceived?.(msg.dataUrl, msg.mimeType, msg.size);

          // Write directly to Native OS Clipboard if supported
          if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
            fetch(msg.dataUrl)
              .then((res) => res.blob())
              .then((blob) => {
                navigator.clipboard.write([new ClipboardItem({ [msg.mimeType]: blob })]).catch(() => {});
              })
              .catch(() => {});
          }
        }

        // 3. File Header & Auto-Resume Handshake
        else if (msg.type === 'FILE_HEADER') {
          const ledgerKey = `${msg.metadata.fileName}_${msg.metadata.fileSize}`;
          const existing = this.transferLedger.get(ledgerKey);

          if (existing && existing.receivedBytes > 0 && existing.receivedBytes < msg.metadata.fileSize) {
            console.log(`[WebRTC Auto-Resume] Found partial transfer for ${msg.metadata.fileName} at ${existing.receivedBytes} bytes. Requesting resume.`);
            this.activeIncomingFile = existing;

            // Signal sender to seek and resume
            const resumeReq: WebRTCMessage = {
              type: 'FILE_RESUME_REQUEST',
              fileId: msg.metadata.fileId,
              resumeOffset: existing.receivedBytes,
            };
            this.dataChannel?.send(JSON.stringify(resumeReq));
          } else {
            this.activeIncomingFile = {
              metadata: msg.metadata,
              receivedBytes: 0,
              chunks: [],
            };
            this.transferLedger.set(ledgerKey, this.activeIncomingFile);
            console.log(`[WebRTC] Incoming file stream: ${msg.metadata.fileName} (${msg.metadata.fileSize} bytes)`);
          }
        }

        // 4. Sender Resume Signal
        else if (msg.type === 'FILE_RESUME_REQUEST') {
          console.log(`[WebRTC Auto-Resume] Sender acknowledged resume request at offset: ${msg.resumeOffset}`);
          this.pendingResumeOffset[msg.fileId] = msg.resumeOffset;
        }

        // 5. File EOF & Download Completion
        else if (msg.type === 'FILE_EOF') {
          if (this.activeIncomingFile) {
            const blob = new Blob(this.activeIncomingFile.chunks);
            const fileName = this.activeIncomingFile.metadata.fileName;
            const relativePath = this.activeIncomingFile.metadata.relativePath;

            const receivedFile = new File([blob], fileName, {
              type: 'application/octet-stream',
            });

            this.onFileReceived?.(receivedFile, relativePath);
            this.triggerDownload(blob, relativePath || fileName);

            // Clear ledger
            const ledgerKey = `${this.activeIncomingFile.metadata.fileName}_${this.activeIncomingFile.metadata.fileSize}`;
            this.transferLedger.delete(ledgerKey);
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

        const percent = Math.min(
          100,
          Math.floor((this.activeIncomingFile.receivedBytes / this.activeIncomingFile.metadata.fileSize) * 100)
        );
        this.onTransferProgress?.(this.activeIncomingFile.metadata.fileId, percent, 74.2);
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

  async sendClipboardText(text: string): Promise<boolean> {
    const payload: WebRTCMessage = {
      type: 'CLIPBOARD_SYNC',
      content: text,
      timestamp: Date.now(),
    };
    return this.broadcastMessage(JSON.stringify(payload));
  }

  async sendClipboardImage(dataUrl: string, mimeType = 'image/png', size = 0): Promise<boolean> {
    const payload: WebRTCMessage = {
      type: 'CLIPBOARD_IMAGE',
      mimeType,
      dataUrl,
      size,
      timestamp: Date.now(),
    };
    return this.broadcastMessage(JSON.stringify(payload));
  }

  async sendFile(
    file: File,
    metadataOrProgress?: Partial<FileMetadata> | ((bytesSent: number, total: number, speedMBs: number, isResumed?: boolean) => void),
    onProgressCallback?: (bytesSent: number, total: number, speedMBs: number, isResumed?: boolean) => void
  ): Promise<boolean> {
    const metadataOverrides: Partial<FileMetadata> =
      typeof metadataOrProgress === 'object' && metadataOrProgress !== null ? metadataOrProgress : {};
    const onProgress =
      typeof metadataOrProgress === 'function' ? metadataOrProgress : onProgressCallback;

    const CHUNK_SIZE = 64 * 1024; // 64 KB slices
    const fileId = `file-${Date.now()}`;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    // 1. Send Header via Mesh Broadcast
    const header: WebRTCMessage = {
      type: 'FILE_HEADER',
      metadata: {
        fileId,
        fileName: file.name,
        fileSize: file.size,
        totalChunks,
        ...metadataOverrides,
      },
    };
    this.broadcastMessage(JSON.stringify(header));

    // Wait a brief 50ms window to see if receiver requests auto-resume from existing chunks
    await new Promise((r) => setTimeout(r, 60));

    let offset = this.pendingResumeOffset[fileId] || 0;
    delete this.pendingResumeOffset[fileId];

    const isResumed = offset > 0;
    if (isResumed) {
      console.log(`[WebRTC Auto-Resume] Resuming streaming ${file.name} from offset ${offset} bytes`);
    }

    // 2. Stream Binary Chunks with Backpressure Control across Mesh Channels
    const startTime = performance.now();

    while (offset < file.size) {
      if (this.dataChannel && this.dataChannel.bufferedAmount > 1024 * 1024) {
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
      this.broadcastMessage(buffer);

      offset += buffer.byteLength;

      const elapsedSec = (performance.now() - startTime) / 1000;
      const speedMBs = elapsedSec > 0 ? parseFloat((offset / (1024 * 1024) / elapsedSec).toFixed(1)) : 0;
      onProgress?.(offset, file.size, speedMBs, isResumed);
    }

    // 3. Send EOF Marker
    const eof: WebRTCMessage = {
      type: 'FILE_EOF',
      fileId,
    };
    this.broadcastMessage(JSON.stringify(eof));

    return true;
  }

  async sendFolderBatch(
    filesWithPaths: { file: File; relativePath: string }[],
    onBatchProgress?: (fileIndex: number, totalFiles: number, currentFileProgress: number) => void
  ): Promise<boolean> {
    const totalFiles = filesWithPaths.length;
    const batchId = `batch-${Date.now()}`;

    for (let i = 0; i < totalFiles; i++) {
      const item = filesWithPaths[i];
      await this.sendFile(
        item.file,
        {
          relativePath: item.relativePath,
          isFolder: true,
          batchId,
          batchIndex: i + 1,
          batchTotal: totalFiles,
        },
        (bytesSent, totalBytes) => {
          const currentPercent = Math.floor((bytesSent / totalBytes) * 100);
          onBatchProgress?.(i + 1, totalFiles, currentPercent);
        }
      );
    }

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
    if (!this.peerConnection) throw new Error('PeerConnection not initialized');
    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }
}

export const webrtcManager = new WebRTCManager();
