import { Elysia } from 'elysia';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { requireOwner } from '../lib/auth';

export const staffRoutes = new Elysia({ prefix: '/staff' })
  .get('/', async ({ request, set }) => {
    const user = await requireOwner(set, request.headers.get('authorization'));
    if (!user) return; // requireOwner sets the error response

    try {
      const staff = await prisma.user.findMany({
        where: { role: 'staff' },
        select: {
          id: true,
          email: true,
          full_name: true,
          role: true,
          created_at: true,
          // exclude password_hash
        },
        orderBy: { created_at: 'desc' },
      });

      return staff;
    } catch (error: any) {
      set.status = 500;
      return { error: error.message };
    }
  })
  .post('/', async ({ request, body, set }) => {
    const user = await requireOwner(set, request.headers.get('authorization'));
    if (!user) return;

    const { email, password, full_name } = body as {
      email: string;
      password: string;
      full_name: string;
    };

    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        set.status = 400;
        return { error: 'Email already in use' };
      }

      const password_hash = await bcrypt.hash(password, 10);

      const newStaff = await prisma.user.create({
        data: {
          email,
          password_hash,
          full_name,
          role: 'staff',
        },
        select: {
          id: true,
          email: true,
          full_name: true,
          role: true,
          created_at: true,
        },
      });

      return { success: true, user: newStaff };
    } catch (error: any) {
      set.status = 500;
      return { error: error.message };
    }
  });
