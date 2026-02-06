import { useState } from 'react';
import { api } from '@/lib/api';
import { Send, Bell } from 'lucide-react';
import { toast } from 'sonner';

interface SendFormProps {
  appId: string;
}

export default function SendForm({ appId }: SendFormProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [icon, setIcon] = useState('');
  const [badge, setBadge] = useState('');
  const [tag, setTag] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const payload: Record<string, string> = { title };
      if (body) payload.body = body;
      if (url) payload.url = url;
      if (icon) payload.icon = icon;
      if (badge) payload.badge = badge;
      if (tag) payload.tag = tag;

      const result = await api.post<{ logId: string; totalSubscribers: number }>(
        `/api/admin/apps/${appId}/send`,
        payload,
      );
      toast.success(`Notification sent to ${result.totalSubscribers} subscriber(s)`);
      setTitle('');
      setBody('');
      setUrl('');
      setIcon('');
      setBadge('');
      setTag('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification title"
            className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Notification body text"
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">URL</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/page"
            className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Icon URL</label>
            <input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="https://..."
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Badge URL</label>
            <input
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              placeholder="https://..."
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Tag</label>
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="notification-group"
            className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          disabled={sending}
          className="flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Send className="w-4 h-4" />
          {sending ? 'Sending...' : 'Send Notification'}
        </button>
      </form>

      {/* Preview */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Preview</h3>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              {icon ? (
                <img src={icon} alt="" className="w-8 h-8 rounded" />
              ) : (
                <Bell className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm text-foreground truncate">
                {title || 'Notification Title'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-3">
                {body || 'Notification body text will appear here.'}
              </p>
              {url && (
                <p className="text-xs text-primary mt-1 truncate">{url}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
