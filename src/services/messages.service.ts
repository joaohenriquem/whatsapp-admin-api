import { prisma } from '../lib/prisma';
import { format } from 'date-fns';

interface CreateMessageInput {
  direction: 'whatsapp_to_slack' | 'slack_to_whatsapp';
  sender_phone: string;
  sender_name?: string;
  message_text: string;
  slack_user?: string;
  slack_channel?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'pending';
  whatsapp_message_id?: string;
  n8n_execution_id?: string;
}

interface ListFilters {
  direction?: 'whatsapp_to_slack' | 'slack_to_whatsapp';
  status?: 'sent' | 'delivered' | 'read' | 'failed' | 'pending';
  startDate?: string;
  endDate?: string;
  search?: string;
}

interface Pagination {
  page: number;
  pageSize: number;
}

export class MessagesService {
  async create(data: CreateMessageInput) {
    const message = await prisma.message.create({ data });
    return message;
  }

  async list(filters: ListFilters, pagination: Pagination) {
    const where: Record<string, unknown> = {};

    if (filters.direction) {
      where.direction = filters.direction;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      const createdAt: Record<string, Date> = {};
      if (filters.startDate) {
        createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        createdAt.lte = end;
      }
      where.created_at = createdAt;
    }

    if (filters.search) {
      where.OR = [
        { message_text: { contains: filters.search, mode: 'insensitive' } },
        { sender_phone: { contains: filters.search, mode: 'insensitive' } },
        { sender_name: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const { page, pageSize } = pagination;
    const skip = (page - 1) * pageSize;

    const [data, totalCount] = await Promise.all([
      prisma.message.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.message.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize) || 1,
      },
    };
  }

  async getById(id: string) {
    return prisma.message.findUnique({ where: { id } });
  }

  async exportCsv(filters: ListFilters) {
    const where: Record<string, unknown> = {};

    if (filters.direction) {
      where.direction = filters.direction;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      const createdAt: Record<string, Date> = {};
      if (filters.startDate) {
        createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        createdAt.lte = end;
      }
      where.created_at = createdAt;
    }

    if (filters.search) {
      where.OR = [
        { message_text: { contains: filters.search, mode: 'insensitive' } },
        { sender_phone: { contains: filters.search, mode: 'insensitive' } },
        { sender_name: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const messages = await prisma.message.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    const columns = [
      'id', 'direction', 'sender_phone', 'sender_name', 'message_text',
      'slack_user', 'slack_channel', 'status', 'whatsapp_message_id',
      'n8n_execution_id', 'created_at', 'updated_at',
    ];

    const formatTimestamp = (date: Date) => format(date, 'dd/MM/yyyy HH:mm:ss');

    const escapeField = (value: string) => {
      if (value.includes('"') || value.includes(',') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const header = columns.join(',');
    const rows = messages.map((msg) =>
      columns.map((col) => {
        const value = (msg as Record<string, unknown>)[col];
        if (value === null || value === undefined) return '';
        if (col === 'created_at' || col === 'updated_at') {
          return escapeField(formatTimestamp(value as Date));
        }
        return escapeField(String(value));
      }).join(','),
    );

    const csv = '\uFEFF' + header + '\n' + rows.join('\n');

    return { csv, count: messages.length };
  }

  async getStats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayWhere = {
      created_at: { gte: todayStart, lte: todayEnd },
    };

    const [todayTotal, directionGroups, failedCount] = await Promise.all([
      prisma.message.count({ where: todayWhere }),
      prisma.message.groupBy({
        by: ['direction'],
        where: todayWhere,
        _count: { id: true },
      }),
      prisma.message.count({
        where: { ...todayWhere, status: 'failed' },
      }),
    ]);

    const todayByDirection: Record<string, number> = {
      whatsapp_to_slack: 0,
      slack_to_whatsapp: 0,
    };
    for (const group of directionGroups) {
      todayByDirection[group.direction] = group._count.id;
    }

    const todayFailureRate =
      todayTotal > 0 ? (failedCount / todayTotal) * 100 : 0;

    // Daily volume for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const dailyVolumeRaw = await prisma.$queryRaw<
      Array<{ date: Date; count: bigint }>
    >`
      SELECT DATE(created_at) as date, COUNT(*)::bigint as count
      FROM messages
      WHERE created_at >= ${thirtyDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const dailyVolume = dailyVolumeRaw.map((row: { date: Date; count: bigint }) => ({
      date: row.date instanceof Date
        ? row.date.toISOString().split('T')[0]
        : String(row.date),
      count: Number(row.count),
    }));

    return {
      todayTotal,
      todayByDirection,
      todayFailureRate,
      dailyVolume,
    };
  }
}
