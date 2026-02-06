import { Hono } from 'hono';
import { eq, count, desc } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { apps, apiKeys, subscriptions } from '../db/schema.js';
import { generateVapidKeys } from '../services/vapid.js';
import { generateApiKey, hashApiKey } from '../lib/utils.js';

const router = new Hono();

// GET /api/admin/apps — list all apps with subscriber counts
router.get('/', async (c) => {
  const allApps = await db
    .select({
      id: apps.id,
      name: apps.name,
      vapidPublicKey: apps.vapidPublicKey,
      vapidSubject: apps.vapidSubject,
      createdAt: apps.createdAt,
      updatedAt: apps.updatedAt,
      subscriberCount: count(subscriptions.id),
    })
    .from(apps)
    .leftJoin(subscriptions, eq(apps.id, subscriptions.appId))
    .groupBy(apps.id)
    .orderBy(desc(apps.createdAt));

  return c.json(allApps);
});

// POST /api/admin/apps — create app
router.post('/', async (c) => {
  const { name, vapidSubject } = await c.req.json<{
    name: string;
    vapidSubject?: string;
  }>();

  if (!name) return c.json({ error: 'Name is required' }, 400);

  const vapid = generateVapidKeys();

  const [app] = await db
    .insert(apps)
    .values({
      name,
      vapidPublicKey: vapid.publicKey,
      vapidPrivateKey: vapid.privateKey,
      vapidSubject: vapidSubject ?? 'mailto:admin@example.com',
    })
    .returning();

  return c.json({
    id: app.id,
    name: app.name,
    vapidPublicKey: app.vapidPublicKey,
    vapidSubject: app.vapidSubject,
    createdAt: app.createdAt,
  }, 201);
});

// GET /api/admin/apps/:id
router.get('/:id', async (c) => {
  const id = c.req.param('id');
  const [app] = await db
    .select({
      id: apps.id,
      name: apps.name,
      vapidPublicKey: apps.vapidPublicKey,
      vapidSubject: apps.vapidSubject,
      createdAt: apps.createdAt,
      updatedAt: apps.updatedAt,
    })
    .from(apps)
    .where(eq(apps.id, id))
    .limit(1);

  if (!app) return c.json({ error: 'App not found' }, 404);

  const [subCount] = await db
    .select({ count: count() })
    .from(subscriptions)
    .where(eq(subscriptions.appId, id));

  return c.json({ ...app, subscriberCount: subCount.count });
});

// PATCH /api/admin/apps/:id
router.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ name?: string; vapidSubject?: string }>();

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name) updates.name = body.name;
  if (body.vapidSubject) updates.vapidSubject = body.vapidSubject;

  const [updated] = await db
    .update(apps)
    .set(updates)
    .where(eq(apps.id, id))
    .returning({
      id: apps.id,
      name: apps.name,
      vapidSubject: apps.vapidSubject,
      updatedAt: apps.updatedAt,
    });

  if (!updated) return c.json({ error: 'App not found' }, 404);
  return c.json(updated);
});

// DELETE /api/admin/apps/:id
router.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const [deleted] = await db.delete(apps).where(eq(apps.id, id)).returning({ id: apps.id });
  if (!deleted) return c.json({ error: 'App not found' }, 404);
  return c.json({ ok: true });
});

// POST /api/admin/apps/:id/api-keys
router.post('/:id/api-keys', async (c) => {
  const appId = c.req.param('id');
  const { label } = await c.req.json<{ label: string }>();

  if (!label) return c.json({ error: 'Label is required' }, 400);

  const [app] = await db.select({ id: apps.id }).from(apps).where(eq(apps.id, appId)).limit(1);
  if (!app) return c.json({ error: 'App not found' }, 404);

  const rawKey = generateApiKey();
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, 8);

  const [created] = await db
    .insert(apiKeys)
    .values({ appId, keyHash, keyPrefix, label })
    .returning();

  // Return the raw key only this one time
  return c.json({
    id: created.id,
    key: rawKey,
    keyPrefix,
    label: created.label,
    createdAt: created.createdAt,
  }, 201);
});

// GET /api/admin/apps/:id/api-keys
router.get('/:id/api-keys', async (c) => {
  const appId = c.req.param('id');
  const keys = await db
    .select({
      id: apiKeys.id,
      keyPrefix: apiKeys.keyPrefix,
      label: apiKeys.label,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
      revoked: apiKeys.revoked,
    })
    .from(apiKeys)
    .where(eq(apiKeys.appId, appId))
    .orderBy(desc(apiKeys.createdAt));

  return c.json(keys);
});

// DELETE /api/admin/apps/:id/api-keys/:keyId — revoke
router.delete('/:id/api-keys/:keyId', async (c) => {
  const keyId = c.req.param('keyId');
  const [updated] = await db
    .update(apiKeys)
    .set({ revoked: true })
    .where(eq(apiKeys.id, keyId))
    .returning({ id: apiKeys.id });

  if (!updated) return c.json({ error: 'Key not found' }, 404);
  return c.json({ ok: true });
});

// GET /api/admin/apps/:id/subscribers
router.get('/:id/subscribers', async (c) => {
  const appId = c.req.param('id');
  const page = parseInt(c.req.query('page') ?? '1');
  const limit = parseInt(c.req.query('limit') ?? '50');
  const offset = (page - 1) * limit;

  const [total] = await db
    .select({ count: count() })
    .from(subscriptions)
    .where(eq(subscriptions.appId, appId));

  const items = await db
    .select({
      id: subscriptions.id,
      endpoint: subscriptions.endpoint,
      userAgent: subscriptions.userAgent,
      createdAt: subscriptions.createdAt,
    })
    .from(subscriptions)
    .where(eq(subscriptions.appId, appId))
    .limit(limit)
    .offset(offset);

  return c.json({ items, total: total.count, page, limit });
});

export default router;
