import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandlerMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error(err.stack);

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    res.status(400).json({ error: 'Erro de validação', details });
    return;
  }

  res.status(500).json({ error: 'Erro interno do servidor' });
}
