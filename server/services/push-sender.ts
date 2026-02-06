import webPush from 'web-push';
import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { subscriptions, notificationLogs } from '../db/schema.js';

const BATCH_SIZE = 50;

interface SendOptions {
  appId: string;
  logId: string;
  vapidPublicKey: string;
  vapidPrivateKey: string;
  vapidSubject: string;
  payload: object;
}

export async function sendNotifications(opts: SendOptions) {
  const { appId, logId, vapidPublicKey, vapidPrivateKey, vapidSubject, payload } = opts;

  // Update log to sending
  await db
    .update(notificationLogs)
    .set({ status: 'sending', startedAt: new Date() })
    .where(eq(notificationLogs.id, logId));

  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const allSubs = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.appId, appId));

  const payloadStr = JSON.stringify(payload);
  let successCount = 0;
  let failCount = 0;
  let staleRemoved = 0;

  // Process in batches
  for (let i = 0; i < allSubs.length; i += BATCH_SIZE) {
    const batch = allSubs.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((sub) =>
        webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keyP256dh, auth: sub.keyAuth },
          },
          payloadStr,
        ),
      ),
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === 'fulfilled') {
        successCount++;
      } else {
        const statusCode = (result.reason as { statusCode?: number })?.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          // Remove stale subscription
          await db
            .delete(subscriptions)
            .where(eq(subscriptions.id, batch[j].id));
          staleRemoved++;
        }
        failCount++;
      }
    }
  }

  // Update log with final counts
  await db
    .update(notificationLogs)
    .set({
      successCount,
      failCount,
      staleRemoved,
      status: failCount === allSubs.length && allSubs.length > 0 ? 'failed' : 'completed',
      completedAt: new Date(),
    })
    .where(eq(notificationLogs.id, logId));
}
