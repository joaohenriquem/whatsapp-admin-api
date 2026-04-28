import { Request, Response } from 'express';
import { MessagesService } from '../services/messages.service';
import { createMessageSchema } from '../validators/message.validator';

const messagesService = new MessagesService();

export class WebhookController {
  async createMessage(req: Request, res: Response): Promise<void> {
    const parsed = createMessageSchema.safeParse(req.body);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      res.status(400).json({ error: 'Erro de validação', details });
      return;
    }

    const message = await messagesService.create(parsed.data);

    res.status(201).json({
      id: message.id,
      message: 'Mensagem criada com sucesso',
    });
  }
}
