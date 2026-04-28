import { PrismaClient, Direction, MessageStatus, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create default admin user
  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "admin@admin.com" },
    update: {},
    create: {
      email: "admin@admin.com",
      name: "Administrador",
      password_hash: passwordHash,
      role: UserRole.admin,
    },
  });

  console.log("Admin user created: admin@admin.com");

  // Create 5 sample messages with varied directions and statuses
  const sampleMessages = [
    {
      direction: Direction.whatsapp_to_slack,
      sender_phone: "+5511999990001",
      sender_name: "João Silva",
      message_text: "Olá, preciso de ajuda com meu pedido",
      slack_user: "U001",
      slack_channel: "#suporte",
      status: MessageStatus.delivered,
      whatsapp_message_id: "wamid.001",
      n8n_execution_id: "exec_001",
    },
    {
      direction: Direction.slack_to_whatsapp,
      sender_phone: "+5511999990002",
      sender_name: "Maria Souza",
      message_text: "Seu pedido foi enviado. Obrigado!",
      slack_user: "U002",
      slack_channel: "#suporte",
      status: MessageStatus.sent,
      whatsapp_message_id: "wamid.002",
      n8n_execution_id: "exec_002",
    },
    {
      direction: Direction.whatsapp_to_slack,
      sender_phone: "+5511999990003",
      sender_name: "Carlos Oliveira",
      message_text: "Quando meu produto vai chegar?",
      slack_user: "U003",
      slack_channel: "#logistica",
      status: MessageStatus.read,
      whatsapp_message_id: "wamid.003",
      n8n_execution_id: "exec_003",
    },
    {
      direction: Direction.whatsapp_to_slack,
      sender_phone: "+5511999990004",
      sender_name: null,
      message_text: "Erro ao processar pagamento",
      slack_user: null,
      slack_channel: "#financeiro",
      status: MessageStatus.failed,
      whatsapp_message_id: "wamid.004",
      n8n_execution_id: "exec_004",
    },
    {
      direction: Direction.slack_to_whatsapp,
      sender_phone: "+5511999990005",
      sender_name: "Ana Costa",
      message_text: "Estamos verificando sua solicitação",
      slack_user: "U005",
      slack_channel: "#suporte",
      status: MessageStatus.pending,
      whatsapp_message_id: null,
      n8n_execution_id: null,
    },
  ];

  for (const msg of sampleMessages) {
    await prisma.message.create({ data: msg });
  }

  console.log("5 sample messages created");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
