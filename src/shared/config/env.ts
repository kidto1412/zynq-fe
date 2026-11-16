import { z } from 'zod';

const envSchema = z.object({
  VITE_API_URL: z.string().default('http://localhost:7001'),
  VITE_WS_SIGNALING_URL: z.string().default('http://localhost:7001/signaling'),
  VITE_STUN_SERVER: z.string().default('stun:stun.l.google.com:19302'),
  VITE_TURN_SERVER: z.string().optional(),
  VITE_TURN_USERNAME: z.string().optional(),
  VITE_TURN_CREDENTIAL: z.string().optional(),
  VITE_MIDTRANS_CLIENT_KEY: z.string().optional(),
  VITE_MIDTRANS_SNAP_URL: z.string().optional(),
  VITE_LEMON_SQUEEZY_STORE_URL: z.string().optional(),
  VITE_APP_NAME: z.string().default('UniBeam'),
  VITE_APP_VERSION: z.string().default('1.0.0'),
});

export const env = envSchema.parse(import.meta.env);
