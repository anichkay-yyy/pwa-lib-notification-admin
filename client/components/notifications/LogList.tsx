import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { NotificationLog, Paginated } from '@/lib/types';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface LogListProps {
  appId: string;
}

export default function LogList({ appId }: LogListProps) {
  const [data, setData] = useState<Paginated<NotificationLog> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null);
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    api
      .get<Paginated<NotificationLog>>(`/api/admin/apps/${appId}/logs?page=${page}&limit=${limit}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [appId, page]);

  if (loading && !data) return <div className="text-muted-foreground py-8">Loading logs...</div>;
  if (!data || data.items.length === 0) {
    return <div className="text-muted-foreground py-8">No notification logs yet.</div>;
  }

  const totalPages = Math.ceil(data.total / limit);

  return (
    <div>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Title</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Total</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Success</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Failed</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Date</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((log) => (
              <tr
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className="border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <td className="px-4 py-3">
                  <StatusBadge status={log.status} />
                </td>
                <td className="px-4 py-3 text-foreground max-w-[200px] truncate">
                  {(log.payload as any)?.title ?? '—'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{log.totalSubscribers}</td>
                <td className="px-4 py-3 text-green-400">{log.successCount ?? '—'}</td>
                <td className="px-4 py-3 text-red-400">{log.failCount ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                  {formatDate(log.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages} ({data.total} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Log Detail Dialog */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Notification Log</h3>
              <button onClick={() => setSelectedLog(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedLog.status} />
                <span className="text-xs text-muted-foreground">{formatDate(selectedLog.createdAt)}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">Total</span>
                  <span className="text-foreground font-medium">{selectedLog.totalSubscribers}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Success</span>
                  <span className="text-green-400 font-medium">{selectedLog.successCount ?? '—'}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Failed</span>
                  <span className="text-red-400 font-medium">{selectedLog.failCount ?? '—'}</span>
                </div>
              </div>
              {selectedLog.staleRemoved != null && selectedLog.staleRemoved > 0 && (
                <div className="text-sm">
                  <span className="text-xs text-muted-foreground">Stale removed: </span>
                  <span className="text-amber-400">{selectedLog.staleRemoved}</span>
                </div>
              )}
              {selectedLog.completedAt && (
                <div className="text-sm">
                  <span className="text-xs text-muted-foreground">Completed: </span>
                  <span className="text-foreground">{formatDate(selectedLog.completedAt)}</span>
                </div>
              )}
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Payload</span>
                <pre className="bg-background rounded-lg border border-border p-3 text-xs text-foreground overflow-x-auto">
                  {JSON.stringify(selectedLog.payload, null, 2)}
                </pre>
              </div>
            </div>
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
