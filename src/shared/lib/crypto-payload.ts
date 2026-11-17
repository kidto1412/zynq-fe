/**
 * Client-side payload encryption for authentication (Login & Register)
 * Standard: AES-256-GCM with SHA-256 key derivation & 12-byte random IV.
 * Built with native Web Crypto API (SubtleCrypto) - zero external bundle overhead.
 */

const DEFAULT_AUTH_SECRET = 'unibeam_session_ephemeral_salt_2026';

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

let cachedCryptoKey: CryptoKey | null = null;

async function getDerivedKey(secret: string): Promise<CryptoKey> {
  if (cachedCryptoKey) return cachedCryptoKey;

  const encoder = new TextEncoder();
  const secretBytes = encoder.encode(secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', secretBytes);

  cachedCryptoKey = await crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  return cachedCryptoKey;
}

export async function encryptAuthPayload(
  data: Record<string, any>
): Promise<{ encryptedData: string; iv: string }> {
  const secret = import.meta.env.VITE_AUTH_SECRET || DEFAULT_AUTH_SECRET;
  const key = await getDerivedKey(secret);

  // 12-byte IV standard for AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Attach timestamp to protect against replay attacks
  const payloadWithMeta = {
    ...data,
    timestamp: Date.now(),
  };

  const encoder = new TextEncoder();
  const encodedPlaintext = encoder.encode(JSON.stringify(payloadWithMeta));

  // Web Crypto AES-GCM automatically appends the 16-byte GCM authentication tag
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encodedPlaintext
  );

  return {
    encryptedData: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv),
  };
}
