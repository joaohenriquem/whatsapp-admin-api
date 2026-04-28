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

## Deploy no Render

1. Acesse [render.com](https://render.com) e faça login
2. Clique em **New** → **Web Service**
3. Conecte o repositório GitHub `whatsapp-admin-api`
4. O Render detecta o `render.yaml` automaticamente. Confirme as configurações:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node dist/index.js`
5. Na aba **Environment**, adicione as variáveis secretas:
   - `DATABASE_URL` → connection string do PostgreSQL (Supabase)
   - `JWT_SECRET` → chave secreta para geração de tokens JWT
   - `API_KEY` → chave de autenticação usada pelo webhook do n8n
6. Clique em **Create Web Service** e aguarde o deploy
7. Teste acessando `https://seu-app.onrender.com/api/health`

> **Nota:** No plano gratuito do Render, o serviço entra em suspensão após 15 min de inatividade. A primeira requisição após a suspensão pode levar alguns segundos a mais.

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
