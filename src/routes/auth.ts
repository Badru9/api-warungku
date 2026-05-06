import { Elysia } from 'elysia';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { createToken } from '../lib/auth';

export const authRoutes = new Elysia({ prefix: '/auth' })
  .post('/login', async ({ body, set }) => {
    const { email, password } = body as { email: string; password: string };

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      set.status = 401;
      return { error: 'Email atau password salah' };
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      set.status = 401;
      return { error: 'Email atau password salah' };
    }

    const token = createToken(user);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
      },
    };
  })
  .post('/logout', async () => {
    return { success: true };
  });
