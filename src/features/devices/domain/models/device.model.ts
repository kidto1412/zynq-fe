export interface TrustedDevice {
  id: string;
  name: string;
  platform: string;
  osVersion: string;
  connectionStatus: 'connected' | 'standby' | 'offline';
  autoAccept: boolean;
  clipboardSharing: boolean;
  fingerprintSha: string;
  lastActive: string;
}

export interface TransferLog {
  id: string;
  fileName: string;
  fileSize: string;
  speed: string;
  direction: 'sent' | 'received';
  targetDevice: string;
  timestamp: string;
  status: 'success' | 'failed';
}
