import { Elysia } from 'elysia';
import { prisma } from '../lib/prisma';
import { getAuthUser, requireOwner } from '../lib/auth';

export const transactionsRoutes = new Elysia({ prefix: '/transactions' })
  .get('/', async ({ request, set }) => {
    const user = await getAuthUser(request.headers.get('authorization'));
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');
    const type = searchParams.get('type');

    try {
      let whereClause: any = {};

      if (productId) whereClause.product_id = productId;
      if (type) whereClause.type = type;

      const transactions = await prisma.stockTransaction.findMany({
        where: whereClause,
        include: {
          product: { select: { name: true } }, // add unit to schema later if needed
          creator: { select: { full_name: true } },
        },
        orderBy: { created_at: 'desc' },
      });

      return transactions.map((t) => ({
        ...t,
        products: t.product ? { name: t.product.name, unit: null } : null,
        profiles: t.creator ? { full_name: t.creator.full_name } : null,
      }));
    } catch (error: any) {
      set.status = 500;
      return { error: error.message };
    }
  })
  .post('/', async ({ request, body, set }) => {
    const user = await requireOwner(set, request.headers.get('authorization'));
    if (!user) return;

    const { product_id, type, quantity, note } = body as {
      product_id: string;
      type: string;
      quantity: number;
      note: string;
    };

    try {
      const product = await prisma.product.findUnique({
        where: { id: product_id },
        select: { current_stock: true, sell_price: true },
      });

      if (!product) {
        set.status = 404;
        return { error: 'Product not found' };
      }

      let stock_after = product.current_stock;
      if (type === 'IN') stock_after += quantity;
      else if (type === 'OUT') stock_after -= quantity;
      else if (type === 'ADJUST') stock_after = quantity;

      if (type === 'OUT' && stock_after < 0) {
        set.status = 400;
        return { error: 'Stok tidak mencukupi' };
      }

      const transaction = await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: product_id },
          data: { current_stock: stock_after },
        });

        return tx.stockTransaction.create({
          data: {
            product_id,
            type,
            quantity: type === 'ADJUST' ? Math.abs(stock_after - product.current_stock) : quantity,
            stock_before: product.current_stock,
            stock_after,
            price_at_time: product.sell_price,
            note,
            created_by: user.id,
          },
        });
      });

      return transaction;
    } catch (error: any) {
      set.status = 500;
      return { error: error.message };
    }
  });
