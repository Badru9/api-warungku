import { Elysia } from 'elysia';
import { prisma } from '../lib/prisma';
import { getAuthUser, requireOwner } from '../lib/auth';

export const productsRoutes = new Elysia({ prefix: '/products' })
  .get('/', async ({ request, set }) => {
    const user = await getAuthUser(request.headers.get('authorization'));
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const categoryId = searchParams.get('category_id');
    const lowStock = searchParams.get('low_stock');

    try {
      let whereClause: any = { deleted_at: null };

      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (categoryId) {
        whereClause.category_id = categoryId;
      }

      const products = await prisma.product.findMany({
        where: whereClause,
        include: { category: { select: { name: true } } },
        orderBy: { name: 'asc' },
      });

      // Flatten category name to match previous Supabase format if needed by frontend
      let result = products.map((p) => ({
        ...p,
        categories: p.category ? { name: p.category.name } : null,
      }));

      if (lowStock === 'true') {
        result = result.filter((p) => p.current_stock <= p.min_stock);
      }

      return result;
    } catch (error: any) {
      set.status = 500;
      return { error: error.message };
    }
  })
  .post('/', async ({ request, body, set }) => {
    const user = await requireOwner(set, request.headers.get('authorization'));
    if (!user) return; // requireOwner already set the error response

    const payload = body as any;

    try {
      const product = await prisma.product.create({
        data: {
          ...payload,
          created_by: user.id,
        },
      });
      return product;
    } catch (error: any) {
      set.status = 500;
      return { error: error.message };
    }
  })
  .get('/:id', async ({ request, params, set }) => {
    const user = await getAuthUser(request.headers.get('authorization'));
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      const product = await prisma.product.findUnique({
        where: { id: params.id },
        include: { category: { select: { name: true } } },
      });

      if (!product) {
        set.status = 404;
        return { error: 'Product not found' };
      }

      return {
        ...product,
        categories: product.category ? { name: product.category.name } : null,
      };
    } catch (error: any) {
      set.status = 500;
      return { error: error.message };
    }
  })
  .patch('/:id', async ({ request, params, body, set }) => {
    const user = await requireOwner(set, request.headers.get('authorization'));
    if (!user) return;

    const payload = body as any;

    try {
      const product = await prisma.product.update({
        where: { id: params.id },
        data: payload,
      });
      return product;
    } catch (error: any) {
      set.status = 500;
      return { error: error.message };
    }
  })
  .delete('/:id', async ({ request, params, set }) => {
    const user = await requireOwner(set, request.headers.get('authorization'));
    if (!user) return;

    try {
      await prisma.product.update({
        where: { id: params.id },
        data: { deleted_at: new Date() },
      });
      return { success: true };
    } catch (error: any) {
      set.status = 500;
      return { error: error.message };
    }
  })
  .get('/:id/price-history', async ({ request, params, set }) => {
    const user = await getAuthUser(request.headers.get('authorization'));
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    try {
      const history = await prisma.priceHistory.findMany({
        where: { product_id: params.id },
        include: { changer: { select: { full_name: true } } },
        orderBy: { changed_at: 'desc' },
      });

      return history.map((h) => ({
        ...h,
        profiles: h.changer ? { full_name: h.changer.full_name } : null,
      }));
    } catch (error: any) {
      set.status = 500;
      return { error: error.message };
    }
  });
