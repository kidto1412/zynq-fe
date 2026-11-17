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
  isFolder?: boolean;
  relativePath?: string;
  batchIndex?: number;
  batchTotal?: number;
  isResumed?: boolean;
  batchId?: string;
}
