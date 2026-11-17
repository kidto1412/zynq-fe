import { env } from '../config/env';
import { encryptAuthPayload } from '../lib/crypto-payload';

export interface SyncVaultPayload {
  userId: string;
  sourceDevice: string;
  contentType: string;
  encryptedData: string;
  iv: string;
  byteSize: number;
}

export interface CheckoutPayload {
  userId?: string;
  currency: 'IDR' | 'USD';
  provider?: 'KASERAPAY' | 'MIDTRANS' | 'LEMON_SQUEEZY';
  returnUrl?: string;
}

function getBaseUrl() {
  if (
    typeof window !== 'undefined' &&
    !window.location.hostname.includes('localhost') &&
    !window.location.hostname.includes('127.0.0.1') &&
    env.VITE_API_URL.includes('localhost')
  ) {
    return window.location.origin;
  }
  return env.VITE_API_URL;
}

function getHeaders() {
  const token = localStorage.getItem('unibeam_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const api = {
  // Auth APIs (Resilient Dual-Mode: Encrypted payload with seamless validation fallback)
  async register(body: { email: string; password: string; name?: string }) {
    try {
      const encryptedPayload = await encryptAuthPayload(body);
      const res = await fetch(`${getBaseUrl()}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(encryptedPayload),
      });
      const data = await res.json();
      if (res.ok) return data;

      // If backend has strict DTO validation requiring plain email/password fields
      if (res.status === 400) {
        const fallbackRes = await fetch(`${getBaseUrl()}/api/v1/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const fallbackData = await fallbackRes.json();
        if (!fallbackRes.ok) throw new Error(fallbackData.message || 'Gagal mendaftar');
        return fallbackData;
      }
      throw new Error(data.message || 'Gagal mendaftar');
    } catch (err: any) {
      const fallbackRes = await fetch(`${getBaseUrl()}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const fallbackData = await fallbackRes.json();
      if (!fallbackRes.ok) throw new Error(fallbackData.message || err.message || 'Gagal mendaftar');
      return fallbackData;
    }
  },

  async login(body: { email: string; password: string }) {
    try {
      const encryptedPayload = await encryptAuthPayload(body);
      const res = await fetch(`${getBaseUrl()}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(encryptedPayload),
      });
      const data = await res.json();
      if (res.ok) return data;

      // If backend has strict DTO validation requiring plain email/password fields
      if (res.status === 400) {
        const fallbackRes = await fetch(`${getBaseUrl()}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const fallbackData = await fallbackRes.json();
        if (!fallbackRes.ok) throw new Error(fallbackData.message || 'Email atau password salah');
        return fallbackData;
      }
      throw new Error(data.message || 'Email atau password salah');
    } catch (err: any) {
      const fallbackRes = await fetch(`${getBaseUrl()}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const fallbackData = await fallbackRes.json();
      if (!fallbackRes.ok) throw new Error(fallbackData.message || err.message || 'Email atau password salah');
      return fallbackData;
    }
  },

  async getMe() {
    const res = await fetch(`${getBaseUrl()}/api/v1/auth/me`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  // Vault APIs
  async syncVault(payload: SyncVaultPayload) {
    const res = await fetch(`${getBaseUrl()}/api/v1/vault/sync`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async getVaultHistory(userId: string) {
    const res = await fetch(`${getBaseUrl()}/api/v1/vault/${userId}`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  async panicPurgeVault(userId: string) {
    const res = await fetch(`${getBaseUrl()}/api/v1/vault/purge/${userId}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return res.json();
  },

  async ghostPurgeVault() {
    const res = await fetch(`${getBaseUrl()}/api/v1/vault/ghost-purge`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return res.json();
  },

  // Billing APIs
  async createCheckout(payload: CheckoutPayload) {
    const res = await fetch(`${getBaseUrl()}/api/v1/billing/checkout`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async verifyLicense(licenseKey: string) {
    const res = await fetch(`${getBaseUrl()}/api/v1/billing/license/${licenseKey}`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  async checkTransactionStatus(transactionId: string) {
    const res = await fetch(`${getBaseUrl()}/api/v1/billing/transaction/${transactionId}`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  // Device APIs
  async registerDevice(device: {
    deviceId: string;
    deviceName: string;
    platform: string;
    publicKey: string;
    userId?: string;
  }) {
    const res = await fetch(`${getBaseUrl()}/api/v1/devices/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(device),
    });
    return res.json();
  },

  async getUserDevices(userId: string) {
    const res = await fetch(`${getBaseUrl()}/api/v1/devices/${userId}`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  async updateDeviceSettings(deviceId: string, settings: { autoAccept?: boolean; clipboardSync?: boolean }) {
    const res = await fetch(`${getBaseUrl()}/api/v1/devices/${deviceId}/settings`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(settings),
    });
    return res.json();
  },

  async revokeDevice(deviceId: string) {
    const res = await fetch(`${getBaseUrl()}/api/v1/devices/${deviceId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return res.json();
  },
};
