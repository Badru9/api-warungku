import { Elysia } from 'elysia';
import { supabase } from '../lib/supabase/client';

export const productsRoutes = new Elysia({ prefix: '/products' })
  .get('/', async ({ request, set }) => {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const categoryId = searchParams.get('category_id');
    const lowStock = searchParams.get('low_stock');

    let query = supabase
      .from('products')
      .select('*, categories(name)')
      .is('deleted_at', null)
      .order('name');

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`,
      );
    }
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;
    if (error) {
      set.status = 500;
      return { error: error.message };
    }

    let result = data;
    if (lowStock === 'true') {
      result = data.filter((p) => p.current_stock <= p.min_stock);
    }
    return result;
  })
  .post('/', async ({ body, set }) => {
    const payload = body as Record<string, any>;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'owner') {
      set.status = 403;
      return { error: 'Forbidden' };
    }

    const { data, error } = await supabase
      .from('products')
      .insert({ ...payload, created_by: user.id })
      .select()
      .single();

    if (error) {
      set.status = 500;
      return { error: error.message };
    }
    return data;
  })
  .get('/:id', async ({ params, set }) => {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('id', params.id)
      .single();

    if (error) {
      set.status = 500;
      return { error: error.message };
    }
    return data;
  })
  .patch('/:id', async ({ params, body, set }) => {
    const payload = body as Record<string, any>;
    const { data, error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      set.status = 500;
      return { error: error.message };
    }
    return data;
  })
  .delete('/:id', async ({ params, set }) => {
    const { error } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', params.id);

    if (error) {
      set.status = 500;
      return { error: error.message };
    }
    return { success: true };
  })
  .get('/:id/price-history', async ({ params, set }) => {
    const { data, error } = await supabase
      .from('price_history')
      .select('*, profiles(full_name)')
      .eq('product_id', params.id)
      .order('changed_at', { ascending: false });

    if (error) {
      set.status = 500;
      return { error: error.message };
    }
    return data;
  });
