import { createMiddleware } from 'hono/factory';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { apiKeys } from '../db/schema.js';
import { hashApiKey } from '../lib/utils.js';

export const apiKeyAuth = createMiddleware(async (c, next) => {
  const apiKey = c.req.header('X-API-Key');
  if (!apiKey) {
    return c.json({ error: 'Missing X-API-Key header' }, 401);
  }

  const hash = hashApiKey(apiKey);
  const appId = c.req.param('appId');

  const [key] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, hash), eq(apiKeys.appId, appId), eq(apiKeys.revoked, false)))
    .limit(1);

  if (!key) {
    return c.json({ error: 'Invalid API key' }, 401);
  }

  // Update last used timestamp
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, key.id));

  await next();
});
