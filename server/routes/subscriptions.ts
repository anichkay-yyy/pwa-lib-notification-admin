import { Hono } from 'hono';
import { eq, and, count } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { apps, subscriptions } from '../db/schema.js';
import { apiKeyAuth } from '../middleware/api-key-auth.js';

const router = new Hono();

// GET /api/apps/:appId/vapid-public-key — no auth required
router.get('/:appId/vapid-public-key', async (c) => {
  const appId = c.req.param('appId');
  const [app] = await db
    .select({ vapidPublicKey: apps.vapidPublicKey })
    .from(apps)
    .where(eq(apps.id, appId))
    .limit(1);

  if (!app) return c.json({ error: 'App not found' }, 404);
  return c.json({ vapidPublicKey: app.vapidPublicKey });
});

// All routes below require API key
router.use('/:appId/subscribe', apiKeyAuth);
router.use('/:appId/unsubscribe', apiKeyAuth);
router.use('/:appId/subscribers/count', apiKeyAuth);

// POST /api/apps/:appId/subscribe
router.post('/:appId/subscribe', async (c) => {
  const appId = c.req.param('appId');
  const body = await c.req.json<{
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }>();

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return c.json({ error: 'Invalid subscription data' }, 400);
  }

  // Upsert: on conflict update keys
  await db
    .insert(subscriptions)
    .values({
      appId,
      endpoint: body.endpoint,
      keyP256dh: body.keys.p256dh,
      keyAuth: body.keys.auth,
      userAgent: c.req.header('User-Agent') ?? null,
    })
    .onConflictDoUpdate({
      target: [subscriptions.appId, subscriptions.endpoint],
      set: {
        keyP256dh: body.keys.p256dh,
        keyAuth: body.keys.auth,
        userAgent: c.req.header('User-Agent') ?? null,
      },
    });

  return c.json({ ok: true }, 201);
});

// POST /api/apps/:appId/unsubscribe
router.post('/:appId/unsubscribe', async (c) => {
  const appId = c.req.param('appId');
  const { endpoint } = await c.req.json<{ endpoint: string }>();

  if (!endpoint) {
    return c.json({ error: 'Missing endpoint' }, 400);
  }

  await db
    .delete(subscriptions)
    .where(and(eq(subscriptions.appId, appId), eq(subscriptions.endpoint, endpoint)));

  return c.json({ ok: true });
});

// GET /api/apps/:appId/subscribers/count
router.get('/:appId/subscribers/count', async (c) => {
  const appId = c.req.param('appId');
  const [result] = await db
    .select({ count: count() })
    .from(subscriptions)
    .where(eq(subscriptions.appId, appId));

  return c.json({ count: result.count });
});

export default router;
