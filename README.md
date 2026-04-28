# WhatsApp Admin API

Backend para painel de monitoramento de mensagens WhatsApp ↔ Slack, integrado com n8n.

## Stack

- Node.js + Express + TypeScript
- Prisma + PostgreSQL (Supabase)
- JWT + API Key auth
- Zod (validação)

## Setup

```bash
npm install
npx prisma generate
npx prisma db push
npx prisma db seed
npm run dev
```

## Variáveis de ambiente

Crie um `.env` na raiz:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=sua_chave_secreta
API_KEY=sua_api_key
PORT=3000
```

## Endpoints

| Rota | Auth | Descrição |
|---|---|---|
| `POST /api/auth/login` | — | Login (retorna JWT) |
| `POST /api/messages` | API Key | Webhook n8n |
| `GET /api/messages` | JWT | Listar mensagens |
| `GET /api/messages/:id` | JWT | Detalhe |
| `GET /api/messages/stats` | JWT | Estatísticas |
| `GET /api/messages/export` | JWT | Exportar CSV |
| `GET /api/health` | — | Health check |
