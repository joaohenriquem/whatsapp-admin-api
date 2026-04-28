import { z } from 'zod';

export const createMessageSchema = z.object({
  direction: z.enum(['whatsapp_to_slack', 'slack_to_whatsapp']),
  sender_phone: z.string().min(1),
  sender_name: z.string().optional(),
  message_text: z.string().min(1),
  slack_user: z.string().optional(),
  slack_channel: z.string().optional(),
  status: z.enum(['sent', 'delivered', 'read', 'failed', 'pending']),
  whatsapp_message_id: z.string().optional(),
  n8n_execution_id: z.string().optional(),
});
