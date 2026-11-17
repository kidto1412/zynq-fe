export interface ClipboardItem {
  id: string;
  type: 'url' | 'text' | 'code' | 'token' | 'image';
  content: string; // Plaintext or Data URL / Blob URL for images
  sourceDevice: string;
  timestamp: string;
  byteSize?: string;
  mimeType?: string;
}
