import { Hono } from 'hono';
import { eq, desc, count } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { apps, subscriptions, notificationLogs } from '../db/schema.js';
import { sendNotifications } from '../services/push-sender.js';

const router = new Hono();

// POST /api/admin/apps/:id/send
router.post('/:id/send', async (c) => {
  const appId = c.req.param('id');
  const payload = await c.req.json();

  if (!payload.title) {
    return c.json({ error: 'title is required in payload' }, 400);
  }

  const [app] = await db
    .select()
    .from(apps)
    .where(eq(apps.id, appId))
    .limit(1);

  if (!app) return c.json({ error: 'App not found' }, 404);

  const [subCount] = await db
    .select({ count: count() })
    .from(subscriptions)
    .where(eq(subscriptions.appId, appId));

  // Create log entry
  const [log] = await db
    .insert(notificationLogs)
    .values({
      appId,
      payload,
      totalSubscribers: subCount.count,
      status: 'pending',
    })
    .returning();

  // Fire and forget
  sendNotifications({
    appId,
    logId: log.id,
    vapidPublicKey: app.vapidPublicKey,
    vapidPrivateKey: app.vapidPrivateKey,
    vapidSubject: app.vapidSubject,
    payload,
  }).catch(async (err) => {
    console.error('Push send error:', err);
    await db
      .update(notificationLogs)
      .set({ status: 'failed', completedAt: new Date() })
      .where(eq(notificationLogs.id, log.id));
  });

  return c.json({ logId: log.id, totalSubscribers: subCount.count }, 202);
});

// GET /api/admin/apps/:id/logs
router.get('/:id/logs', async (c) => {
  const appId = c.req.param('id');
  const page = parseInt(c.req.query('page') ?? '1');
  const limit = parseInt(c.req.query('limit') ?? '20');
  const offset = (page - 1) * limit;

  const [total] = await db
    .select({ count: count() })
    .from(notificationLogs)
    .where(eq(notificationLogs.appId, appId));

  const items = await db
    .select()
    .from(notificationLogs)
    .where(eq(notificationLogs.appId, appId))
    .orderBy(desc(notificationLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json({ items, total: total.count, page, limit });
});

// GET /api/admin/apps/:id/logs/:logId
router.get('/:id/logs/:logId', async (c) => {
  const logId = c.req.param('logId');
  const [log] = await db
    .select()
    .from(notificationLogs)
    .where(eq(notificationLogs.id, logId))
    .limit(1);

  if (!log) return c.json({ error: 'Log not found' }, 404);
  return c.json(log);
});

export default router;
