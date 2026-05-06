import { Elysia } from 'elysia';
import { prisma } from '../lib/prisma';
import { getAuthUser } from '../lib/auth';

export const categoriesRoutes = new Elysia({ prefix: '/categories' })
  .get('/', async ({ request, set }) => {
    const user = await getAuthUser(request.headers.get('authorization'));
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      const categories = await prisma.category.findMany({
        orderBy: { name: 'asc' },
      });
      return categories;
    } catch (error: any) {
      set.status = 500;
      return { error: error.message };
    }
  })
  .post('/', async ({ request, body, set }) => {
    const user = await getAuthUser(request.headers.get('authorization'));
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const { name } = body as { name: string };

    try {
      const category = await prisma.category.create({
        data: { name },
      });
      return category;
    } catch (error: any) {
      set.status = 500;
      return { error: error.message };
    }
  });
