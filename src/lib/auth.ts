import jwt from 'jsonwebtoken';
import type { User } from '@prisma/client';
import { prisma } from './prisma';

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('JWT_SECRET must be set');
}

const JWT_SECRET: string = jwtSecret;

type JwtPayload = {
  sub: string;
  email: string;
  role: string;
};

export type AuthUser = Pick<User, 'id' | 'email' | 'role' | 'full_name'>;

export function createToken(user: AuthUser) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    {
      expiresIn: '7d',
    },
  );
}

export async function getAuthUser(
  authHeader: string | null,
): Promise<AuthUser | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    const token = authHeader.slice('Bearer '.length);
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;

    return await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, full_name: true },
    });
  } catch {
    return null;
  }
}

export async function requireOwner(set: any, authHeader: string | null) {
  const user = await getAuthUser(authHeader);

  if (!user) {
    set.status = 401;
    return null;
  }

  if (user.role !== 'owner') {
    set.status = 403;
    return null;
  }

  return user;
}
