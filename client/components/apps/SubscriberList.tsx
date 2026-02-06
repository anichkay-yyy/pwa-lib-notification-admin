import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Subscription, Paginated } from '@/lib/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SubscriberListProps {
  appId: string;
}

export default function SubscriberList({ appId }: SubscriberListProps) {
  const [data, setData] = useState<Paginated<Subscription> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    api
      .get<Paginated<Subscription>>(`/api/admin/apps/${appId}/subscribers?page=${page}&limit=${limit}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [appId, page]);

  if (loading && !data) return <div className="text-muted-foreground py-8">Loading subscribers...</div>;
  if (!data || data.items.length === 0) {
    return <div className="text-muted-foreground py-8">No subscribers yet.</div>;
  }

  const totalPages = Math.ceil(data.total / limit);

  return (
    <div>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Endpoint</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">User Agent</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Created</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((sub) => (
              <tr key={sub.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-foreground font-mono text-xs max-w-[300px] truncate">
                  {sub.endpoint}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">
                  {sub.userAgent ?? '—'}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                  {formatDate(sub.createdAt)}
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
    </div>
  );
}
