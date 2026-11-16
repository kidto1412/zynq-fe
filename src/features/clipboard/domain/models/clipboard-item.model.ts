export interface ClipboardItem {
  id: string;
  type: 'url' | 'text' | 'code' | 'token';
  content: string;
  sourceDevice: string;
  timestamp: string;
  byteSize?: string;
}
