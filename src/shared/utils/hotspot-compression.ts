import pako from 'pako';

export function compressHotspotPayload(data: unknown): string {
  try {
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
    const deflated = pako.deflate(jsonStr);
    let binary = '';
    const len = deflated.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(deflated[i]);
    }
    return 'zh:' + btoa(binary);
  } catch (err) {
    console.warn('[Hotspot Compression] Fallback to raw string:', err);
    return typeof data === 'string' ? data : JSON.stringify(data);
  }
}

export function decompressHotspotPayload(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith('zh:')) {
    try {
      const b64 = trimmed.slice(3);
      const binary = atob(b64);
      const u8 = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        u8[i] = binary.charCodeAt(i);
      }
      return pako.inflate(u8, { to: 'string' });
    } catch (err) {
      console.error('[Hotspot Decompression] Failed to decompress payload:', err);
      throw new Error('Format sinyal QR Hotspot rusak atau tidak valid.');
    }
  }
  return trimmed;
}
