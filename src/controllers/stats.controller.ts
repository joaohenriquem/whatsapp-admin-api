import { Request, Response } from 'express';
import { MessagesService } from '../services/messages.service';

const messagesService = new MessagesService();

export class StatsController {
  async getStats(_req: Request, res: Response): Promise<void> {
    const stats = await messagesService.getStats();
    res.json(stats);
  }
}
