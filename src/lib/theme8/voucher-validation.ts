import { z } from "zod";

export const voucherRequestInputSchema = z.object({
  purchaserName: z.string().trim().min(2).max(80).regex(/^[^\r\n<>]+$/),
  purchaserInstagram: z.string().trim().regex(/^@?[A-Za-z0-9._]{1,30}$/),
  recipientName: z.string().trim().min(2).max(80).regex(/^[^\r\n<>]+$/),
  serviceId: z.string().regex(/^[a-f\d]{24}$/i),
});

export const voucherRequestResultSchema = z.object({
  requestCode: z.string(),
  serviceName: z.string(),
  notificationSent: z.boolean(),
  dmUrl: z.string().url(),
  greetingName: z.string(),
});

export const voucherRequestErrorSchema = z.object({ error: z.string() });
