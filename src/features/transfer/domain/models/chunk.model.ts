export interface TransferItem {
  id: string;
  fileName: string;
  fileSize: number;
  transferredBytes: number;
  speedMBs: number;
  status: 'streaming' | 'paused' | 'completed' | 'canceled';
  senderDevice: string;
  receiverDevice: string;
  etaSeconds: number;
}
