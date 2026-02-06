import { createMiddleware } from 'hono/factory';
import { createHash, timingSafeEqual } from 'node:crypto';
import { getCookie } from 'hono/cookie';

function signToken(password: string, secret: string): string {
  return createHash('sha256').update(`${password}:${secret}`).digest('hex');
}

export function createAdminToken(): string {
  const password = process.env.ADMIN_PASSWORD!;
  const secret = process.env.COOKIE_SECRET!;
  return signToken(password, secret);
}

export function verifyAdminToken(token: string): boolean {
  const expected = createAdminToken();
  if (token.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export const adminAuth = createMiddleware(async (c, next) => {
  const token = getCookie(c, 'admin_token');
  if (!token || !verifyAdminToken(token)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
});
