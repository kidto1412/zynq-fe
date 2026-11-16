export interface DevicePeer {
  id: string;
  name: string;
  model: string;
  platform: 'ios' | 'android' | 'macos' | 'windows' | 'linux';
  signal: string;
  isOnline: boolean;
  ip?: string;
  fingerprint: string;
}

export interface PairingRoom {
  roomId: string;
  pin: string;
  expiresAt: number;
}
