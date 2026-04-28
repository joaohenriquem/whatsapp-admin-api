import { z } from 'zod';

export const messageQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  direction: z.enum(['whatsapp_to_slack', 'slack_to_whatsapp']).optional(),
  status: z.enum(['sent', 'delivered', 'read', 'failed', 'pending']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
});
