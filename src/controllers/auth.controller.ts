import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { loginSchema } from '../validators/auth.validator';

const authService = new AuthService();

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    try {
      const result = await authService.login(parsed.data.email, parsed.data.password);

      if (!result) {
        res.status(401).json({ error: 'Credenciais inválidas' });
        return;
      }

      res.json(result);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}
