import { z } from 'zod';

export const pinInputSchema = z.object({
  pin: z.string().length(6, { message: 'PIN harus 6 digit angka/huruf' }),
});

export type PinInputValues = z.infer<typeof pinInputSchema>;
