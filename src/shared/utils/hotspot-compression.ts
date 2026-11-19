import pako from 'pako';

export function compressHotspotPayload(data: any): string {
  try {
    let payloadToCompress = data;

    // Compact tuple serialization to drastically shrink QR code module density
    if (typeof data === 'object' && data !== null && data.protocol === 'zynq-hotspot') {
      payloadToCompress = [
        'zh',
        data.type === 'offer' ? 'o' : 'a',
        data.sdp,
        data.deviceName || '',
        data.platform || 'unknown',
        data.deviceId || '',
      ];
    }

    const jsonStr = typeof payloadToCompress === 'string' ? payloadToCompress : JSON.stringify(payloadToCompress);
    const deflated = pako.deflate(jsonStr, { level: 9 });
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
  let decompressedStr = trimmed;

  if (trimmed.startsWith('zh:')) {
    try {
      const b64 = trimmed.slice(3);
      const binary = atob(b64);
      const u8 = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        u8[i] = binary.charCodeAt(i);
      }
      decompressedStr = pako.inflate(u8, { to: 'string' });
    } catch (err) {
      console.error('[Hotspot Decompression] Failed to decompress payload:', err);
      throw new Error('Format sinyal QR Hotspot rusak atau tidak valid.');
    }
  }

  // If payload was compressed using compact tuple, normalize back to HotspotQRPayload JSON
  try {
    const parsed = JSON.parse(decompressedStr);
    if (Array.isArray(parsed) && parsed[0] === 'zh') {
      return JSON.stringify({
        protocol: 'zynq-hotspot',
        type: parsed[1] === 'o' ? 'offer' : 'answer',
        sdp: parsed[2],
        deviceName: parsed[3],
        platform: parsed[4],
        deviceId: parsed[5],
      });
    }
    return decompressedStr;
  } catch {
    return decompressedStr;
  }
}

