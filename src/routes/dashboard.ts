import { Elysia } from 'elysia';
import { prisma } from '../lib/prisma';
import { getAuthUser } from '../lib/auth';

export const dashboardRoutes = new Elysia({ prefix: '/dashboard' })
  .get('/summary', async ({ request, set }) => {
    const user = await getAuthUser(request.headers.get('authorization'));
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      const totalProducts = await prisma.product.count({
        where: { deleted_at: null },
      });

      const products = await prisma.product.findMany({
        where: { deleted_at: null },
        select: { current_stock: true, min_stock: true },
      });

      const lowStock = products.filter(
        (p) => p.current_stock <= p.min_stock,
      ).length;

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const transactionsToday = await prisma.stockTransaction.count({
        where: {
          created_at: {
            gte: startOfDay,
          },
        },
      });

      return {
        totalProducts,
        lowStock,
        transactionsToday,
      };
    } catch (error: any) {
      set.status = 500;
      return { error: error.message };
    }
  })
  .get('/chart', async ({ request, set }) => {
    const user = await getAuthUser(request.headers.get('authorization'));
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'weekly';

    const startDate = new Date();
    if (period === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    try {
      const data = await prisma.stockTransaction.findMany({
        where: {
          created_at: {
            gte: startDate,
          },
        },
        select: {
          type: true,
          quantity: true,
          created_at: true,
        },
        orderBy: {
          created_at: 'asc',
        },
      });

      return data;
    } catch (error: any) {
      set.status = 500;
      return { error: error.message };
    }
  });
