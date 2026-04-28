import { Request, Response } from 'express';
import { MessagesService } from '../services/messages.service';
import { messageQuerySchema } from '../validators/query.validator';
import { format } from 'date-fns';

const messagesService = new MessagesService();

export class MessagesController {
  async list(req: Request, res: Response): Promise<void> {
    const parsed = messageQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      res.status(400).json({ error: 'Erro de validação', details });
      return;
    }

    const { page, pageSize, direction, status, startDate, endDate, search } =
      parsed.data;

    const result = await messagesService.list(
      { direction, status, startDate, endDate, search },
      { page, pageSize },
    );

    res.json(result);
  }

  async getById(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;

    const message = await messagesService.getById(id);

    if (!message) {
      res.status(404).json({ error: 'Mensagem não encontrada' });
      return;
    }

    res.json(message);
  }

  async exportCsv(req: Request, res: Response): Promise<void> {
    const parsed = messageQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      res.status(400).json({ error: 'Erro de validação', details });
      return;
    }

    const { direction, status, startDate, endDate, search } = parsed.data;

    const { csv, count } = await messagesService.exportCsv({
      direction,
      status,
      startDate,
      endDate,
      search,
    });

    const dateStr = format(new Date(), 'yyyyMMdd');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=mensagens_export_${dateStr}.csv`,
    );

    if (count > 10000) {
      res.setHeader('X-Export-Warning', 'large-dataset');
    }

    res.send(csv);
  }
}
