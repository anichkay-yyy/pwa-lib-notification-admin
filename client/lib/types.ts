export interface App {
  id: string;
  name: string;
  vapidPublicKey: string;
  vapidSubject: string;
  subscriberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  id: string;
  keyPrefix: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
}

export interface ApiKeyCreated extends ApiKey {
  key: string;
}

export interface Subscription {
  id: string;
  endpoint: string;
  userAgent: string | null;
  createdAt: string;
}

export interface NotificationLog {
  id: string;
  appId: string;
  payload: Record<string, unknown>;
  totalSubscribers: number;
  successCount: number | null;
  failCount: number | null;
  staleRemoved: number | null;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  completedAt: string | null;
}

export interface AppStats {
  subscriberCount: number;
  totalNotificationsSent: number;
  totalSuccess: number;
  totalFail: number;
  totalStaleRemoved: number;
  recentLogs: Pick<NotificationLog, 'id' | 'status' | 'totalSubscribers' | 'successCount' | 'failCount' | 'createdAt'>[];
  subscribersPerDay: { date: string; count: number }[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
