import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { serveStatic } from '@hono/node-server/serve-static';
import { createHash, timingSafeEqual } from 'node:crypto';
import { adminAuth, createAdminToken, verifyAdminToken } from './middleware/admin-auth.js';
import subscriptionsRouter from './routes/subscriptions.js';
import appsRouter from './routes/apps.js';
import notificationsRouter from './routes/notifications.js';
import analyticsRouter from './routes/analytics.js';

const app = new Hono();

app.use('*', logger());
app.use(
  '/api/*',
  cors({
    origin: (origin) => origin ?? '*',
    credentials: true,
  }),
);

// --- Auth routes ---

app.post('/api/admin/login', async (c) => {
  const { password } = await c.req.json<{ password: string }>();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return c.json({ error: 'ADMIN_PASSWORD not configured' }, 500);
  }

  const inputBuf = Buffer.from(password ?? '');
  const expectedBuf = Buffer.from(adminPassword);

  if (inputBuf.length !== expectedBuf.length || !timingSafeEqual(inputBuf, expectedBuf)) {
    return c.json({ error: 'Invalid password' }, 401);
  }

  const token = createAdminToken();
  setCookie(c, 'admin_token', token, {
    httpOnly: true,
    sameSite: 'Strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return c.json({ ok: true });
});

app.post('/api/admin/logout', (c) => {
  deleteCookie(c, 'admin_token', { path: '/' });
  return c.json({ ok: true });
});

app.get('/api/admin/me', (c) => {
  const token = getCookie(c, 'admin_token');
  if (!token || !verifyAdminToken(token)) {
    return c.json({ authenticated: false }, 401);
  }
  return c.json({ authenticated: true });
});

// --- Public API routes ---
app.route('/api/apps', subscriptionsRouter);

// --- Admin API routes (protected) ---
app.use('/api/admin/apps/*', adminAuth);
app.use('/api/admin/apps', adminAuth);
app.route('/api/admin/apps', appsRouter);

// Notifications and analytics are nested under apps admin
app.route('/api/admin/apps', notificationsRouter);
app.route('/api/admin/apps', analyticsRouter);

// --- Static file serving (production) ---
app.use('/*', serveStatic({ root: './dist/client' }));
app.get('/*', serveStatic({ root: './dist/client', path: 'index.html' }));

const port = parseInt(process.env.PORT ?? '3000');
console.log(`Server running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
