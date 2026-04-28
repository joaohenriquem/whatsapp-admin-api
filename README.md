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

## Integração com o Frontend

### Variável de ambiente no frontend

Configure a URL base da API no `.env` do projeto frontend:

```env
VITE_API_URL=https://whatsapp-admin-api.onrender.com
```

### Autenticação (Login)

```ts
const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@admin.com', password: 'admin123' }),
});

const { token, user } = await response.json();
// Salve o token no localStorage ou estado global
localStorage.setItem('token', token);
```

### Requisições autenticadas (JWT)

Todas as rotas protegidas exigem o header `Authorization: Bearer <token>`:

```ts
const token = localStorage.getItem('token');

// Listar mensagens com filtros
const response = await fetch(
  `${import.meta.env.VITE_API_URL}/api/messages?page=1&pageSize=20&direction=whatsapp_to_slack`,
  { headers: { Authorization: `Bearer ${token}` } }
);
const { data, pagination } = await response.json();

// Buscar mensagem por ID
const msg = await fetch(`${import.meta.env.VITE_API_URL}/api/messages/${id}`, {
  headers: { Authorization: `Bearer ${token}` },
}).then(r => r.json());

// Estatísticas
const stats = await fetch(`${import.meta.env.VITE_API_URL}/api/messages/stats`, {
  headers: { Authorization: `Bearer ${token}` },
}).then(r => r.json());

// Exportar CSV
const csv = await fetch(`${import.meta.env.VITE_API_URL}/api/messages/export`, {
  headers: { Authorization: `Bearer ${token}` },
}).then(r => r.blob());
```

### Parâmetros de query (GET /api/messages)

| Parâmetro | Tipo | Padrão | Descrição |
|---|---|---|---|
| `page` | number | 1 | Página atual |
| `pageSize` | number | 20 | Itens por página (máx 100) |
| `direction` | string | — | `whatsapp_to_slack` ou `slack_to_whatsapp` |
| `status` | string | — | `sent`, `delivered`, `read`, `failed`, `pending` |
| `startDate` | string | — | Data início (YYYY-MM-DD) |
| `endDate` | string | — | Data fim (YYYY-MM-DD) |
| `search` | string | — | Busca em texto, telefone e nome |

### Tratamento de erros

A API retorna erros no formato:

```json
{ "error": "Mensagem de erro", "details": [{ "field": "campo", "message": "detalhe" }] }
```

Códigos HTTP comuns:
- `401` → Token inválido/expirado (redirecionar para login)
- `400` → Erro de validação
- `403` → API Key inválida (rota de webhook)
- `404` → Recurso não encontrado
- `429` → Rate limit excedido
