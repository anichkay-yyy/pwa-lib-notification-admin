import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { AppStats } from '@/lib/types';
import { Users, Send, CheckCircle, XCircle, Trash2 } from 'lucide-react';

interface AppOverviewProps {
  appId: string;
}

export default function AppOverview({ appId }: AppOverviewProps) {
  const [stats, setStats] = useState<AppStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<AppStats>(`/api/admin/apps/${appId}/stats`)
      .then(setStats)
      .finally(() => setLoading(false));
  }, [appId]);

  if (loading) return <div className="text-muted-foreground py-8">Loading stats...</div>;
  if (!stats) return <div className="text-muted-foreground py-8">Failed to load stats.</div>;

  const statCards = [
    { label: 'Subscribers', value: stats.subscriberCount, icon: Users, color: 'text-blue-400' },
    { label: 'Total Sent', value: stats.totalNotificationsSent, icon: Send, color: 'text-indigo-400' },
    { label: 'Successful', value: stats.totalSuccess, icon: CheckCircle, color: 'text-green-400' },
    { label: 'Failed', value: stats.totalFail, icon: XCircle, color: 'text-red-400' },
    { label: 'Stale Removed', value: stats.totalStaleRemoved, icon: Trash2, color: 'text-amber-400' },
  ];

  const maxSubscribers = Math.max(...stats.subscribersPerDay.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Subscribers Per Day */}
      {stats.subscribersPerDay.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Subscribers (last 30 days)</h3>
          <div className="flex items-end gap-1 h-32">
            {stats.subscribersPerDay.map((day) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div className="absolute -top-6 opacity-0 group-hover:opacity-100 text-xs text-muted-foreground whitespace-nowrap transition-opacity">
                  {day.count} — {day.date}
                </div>
                <div
                  className="w-full bg-primary/80 rounded-t min-h-[2px]"
                  style={{ height: `${(day.count / maxSubscribers) * 100}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Logs */}
      {stats.recentLogs.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-medium text-foreground mb-3">Recent Notifications</h3>
          <div className="space-y-2">
            {stats.recentLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <StatusBadge status={log.status} />
                  <span className="text-sm text-muted-foreground">
                    {log.totalSubscribers} recipients
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'bg-green-500/10 text-green-400',
    pending: 'bg-yellow-500/10 text-yellow-400',
    failed: 'bg-red-500/10 text-red-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${styles[status] ?? styles.pending}`}>
      {status}
    </span>
  );
}
