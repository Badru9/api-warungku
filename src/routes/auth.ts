import { Elysia } from 'elysia';
import { supabase } from '../lib/supabase/client';

export const authRoutes = new Elysia({ prefix: '/auth' })
  .post('/login', async ({ body, set }) => {
    const { email, password } = body as { email: string; password: string };
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log('Login attempt:', { email, error });

    if (error) {
      set.status = 401;
      return { error: 'Email atau password salah' };
    }
    return { user: data.user };
  })
  .post('/logout', async ({ set }) => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      set.status = 400;
      return { error: error.message };
    }
    return { success: true };
  });
