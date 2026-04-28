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

## Integração com n8n

A API recebe mensagens do n8n via webhook (`POST /api/messages`), autenticado por API Key.

### Configuração no n8n

#### 1. Node HTTP Request (enviar mensagem para a API)

No seu fluxo do n8n, adicione um node **HTTP Request** com a seguinte configuração:

- **Method:** POST
- **URL:** `https://whatsapp-admin-api.onrender.com/api/messages`
- **Authentication:** None (a autenticação é via header)
- **Headers:**
  - `Content-Type`: `application/json`
  - `x-api-key`: `sua_api_key` (mesma configurada no Render)

#### 2. Body da requisição

O body deve conter os dados da mensagem no formato JSON.

**WhatsApp → Slack (mapeamento do WhatsApp Trigger):**

```json
{
  "direction": "whatsapp_to_slack",
  "sender_phone": "{{ $json.messages[0].from }}",
  "sender_name": "{{ $json.contacts[0].profile.name }}",
  "message_text": "{{ $json.messages[0].text.body }}",
  "status": "sent",
  "whatsapp_message_id": "{{ $json.messages[0].id }}",
  "n8n_execution_id": "{{ $execution.id }}"
}
```

Mapeamento dos campos do WhatsApp Trigger:

| Campo API | Expressão n8n | Exemplo |
|---|---|---|
| `sender_phone` | `{{ $json.messages[0].from }}` | `5511995132636` |
| `sender_name` | `{{ $json.contacts[0].profile.name }}` | `João Henrique` |
| `message_text` | `{{ $json.messages[0].text.body }}` | `Olá` |
| `whatsapp_message_id` | `{{ $json.messages[0].id }}` | `wamid.HBgNNTU...` |
| `n8n_execution_id` | `{{ $execution.id }}` | ID da execução atual |

**Slack → WhatsApp (mapeamento do Slack Trigger):**

```json
{
  "direction": "slack_to_whatsapp",
  "sender_phone": "+5511999990001",
  "message_text": "{{ $json.text }}",
  "slack_user": "{{ $json.user }}",
  "slack_channel": "{{ $json.channel }}",
  "status": "sent",
  "n8n_execution_id": "{{ $execution.id }}"
}
```

Mapeamento dos campos do Slack Trigger:

| Campo API | Expressão n8n | Exemplo |
|---|---|---|
| `message_text` | `{{ $json.text }}` | `olá` |
| `slack_user` | `{{ $json.user }}` | `U0AUKQHAU22` |
| `slack_channel` | `{{ $json.channel }}` | `C0AV79SABHP` |
| `n8n_execution_id` | `{{ $execution.id }}` | ID da execução atual |

> **Nota:** O `sender_phone` deve ser preenchido com o telefone do destinatário no WhatsApp. Você pode obtê-lo de um node anterior no fluxo (ex: busca no banco ou variável do contexto da conversa).

#### 3. Campos obrigatórios e opcionais

| Campo | Obrigatório | Descrição |
|---|---|---|
| `direction` | Sim | `whatsapp_to_slack` ou `slack_to_whatsapp` |
| `sender_phone` | Sim | Telefone do remetente |
| `message_text` | Sim | Texto da mensagem |
| `status` | Sim | `sent`, `delivered`, `read`, `failed` ou `pending` |
| `sender_name` | Não | Nome do remetente |
| `slack_user` | Não | ID do usuário no Slack |
| `slack_channel` | Não | Canal do Slack |
| `whatsapp_message_id` | Não | ID da mensagem no WhatsApp |
| `n8n_execution_id` | Não | ID da execução no n8n (`{{ $execution.id }}`) |

#### 4. Resposta de sucesso

```json
{
  "id": "uuid-da-mensagem",
  "message": "Mensagem criada com sucesso"
}
```

#### 5. Exemplo de fluxo completo

```
WhatsApp Trigger → Processar dados → HTTP Request (API) → Slack
                                          ↑
                                    POST /api/messages
                                    x-api-key: sua_key
```

**WhatsApp → Slack:**
1. WhatsApp Trigger recebe a mensagem
2. Node de processamento extrai os dados (telefone, nome, texto)
3. HTTP Request envia para a API com `direction: "whatsapp_to_slack"` e `status: "sent"`
4. Slack node envia a mensagem para o canal

**Slack → WhatsApp:**
1. Slack Trigger recebe a mensagem
2. Node de processamento extrai os dados
3. HTTP Request envia para a API com `direction: "slack_to_whatsapp"` e `status: "sent"`
4. WhatsApp node envia a mensagem para o contato

#### 6. Atualização de status

Para atualizar o status da mensagem (ex: `delivered`, `read`), envie uma nova mensagem com os mesmos dados e o status atualizado. O painel exibirá o histórico completo.

#### 7. Rate Limiting

O endpoint de webhook possui rate limiting de **100 requisições por minuto** por IP. Se exceder, a API retorna `429 Too Many Requests`.
