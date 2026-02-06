import { Hono } from 'hono';
import { eq, count, sum, desc, sql } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { subscriptions, notificationLogs } from '../db/schema.js';

const router = new Hono();

// GET /api/admin/apps/:id/stats
router.get('/:id/stats', async (c) => {
  const appId = c.req.param('id');

  const [subCount] = await db
    .select({ count: count() })
    .from(subscriptions)
    .where(eq(subscriptions.appId, appId));

  const [logStats] = await db
    .select({
      totalSent: count(),
      totalSuccess: sum(notificationLogs.successCount),
      totalFail: sum(notificationLogs.failCount),
      totalStaleRemoved: sum(notificationLogs.staleRemoved),
    })
    .from(notificationLogs)
    .where(eq(notificationLogs.appId, appId));

  // Recent 5 logs
  const recentLogs = await db
    .select({
      id: notificationLogs.id,
      status: notificationLogs.status,
      totalSubscribers: notificationLogs.totalSubscribers,
      successCount: notificationLogs.successCount,
      failCount: notificationLogs.failCount,
      createdAt: notificationLogs.createdAt,
    })
    .from(notificationLogs)
    .where(eq(notificationLogs.appId, appId))
    .orderBy(desc(notificationLogs.createdAt))
    .limit(5);

  // Subscribers added per day (last 30 days)
  const subscribersPerDay = await db
    .select({
      date: sql<string>`DATE(${subscriptions.createdAt})`.as('date'),
      count: count(),
    })
    .from(subscriptions)
    .where(eq(subscriptions.appId, appId))
    .groupBy(sql`DATE(${subscriptions.createdAt})`)
    .orderBy(sql`DATE(${subscriptions.createdAt})`)
    .limit(30);

  return c.json({
    subscriberCount: subCount.count,
    totalNotificationsSent: logStats.totalSent,
    totalSuccess: Number(logStats.totalSuccess ?? 0),
    totalFail: Number(logStats.totalFail ?? 0),
    totalStaleRemoved: Number(logStats.totalStaleRemoved ?? 0),
    recentLogs,
    subscribersPerDay,
  });
});

export default router;
