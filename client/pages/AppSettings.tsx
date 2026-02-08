import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { App, ApiKey, ApiKeyCreated } from '@/lib/types';
import { ArrowLeft, Copy, Check, Trash2, X, Plus, AlertTriangle } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export default function AppSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<App | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [name, setName] = useState('');
  const [vapidSubject, setVapidSubject] = useState('');
  const [saving, setSaving] = useState(false);

  // API key dialogs
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [keyLabel, setKeyLabel] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKey, setNewKey] = useState<ApiKeyCreated | null>(null);

  // Delete confirm
  const [showDeleteApp, setShowDeleteApp] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showRevokeKey, setShowRevokeKey] = useState<string | null>(null);

  // Clipboard feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get<App>(`/api/admin/apps/${id}`),
      api.get<ApiKey[]>(`/api/admin/apps/${id}/api-keys`),
    ]).then(([appData, keys]) => {
      setApp(appData);
      setName(appData.name);
      setVapidSubject(appData.vapidSubject);
      setApiKeys(keys);
    }).finally(() => setLoading(false));
  }, [id]);

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(label);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Copied to clipboard');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      const updated = await api.patch<App>(`/api/admin/apps/${id}`, { name, vapidSubject });
      setApp((prev) => prev ? { ...prev, ...updated } : prev);
      toast.success('Settings saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setCreatingKey(true);
    try {
      const created = await api.post<ApiKeyCreated>(`/api/admin/apps/${id}/api-keys`, { label: keyLabel });
      setNewKey(created);
      setApiKeys((prev) => [created, ...prev]);
      setKeyLabel('');
      setShowCreateKey(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create key');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!id) return;
    try {
      await api.delete(`/api/admin/apps/${id}/api-keys/${keyId}`);
      setApiKeys((prev) => prev.map((k) => (k.id === keyId ? { ...k, revoked: true } : k)));
      setShowRevokeKey(null);
      toast.success('Key revoked');
    } catch (err: any) {
      toast.error(err.message || 'Failed to revoke key');
    }
  };

  const handleDeleteApp = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await api.delete(`/api/admin/apps/${id}`);
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete app');
      setDeleting(false);
    }
  };

  if (loading) return <div className="text-muted-foreground">Loading...</div>;
  if (!app) return <div className="text-muted-foreground">App not found.</div>;

  return (
    <div>
      <Toaster theme="dark" />
      <Link
        to={`/apps/${app.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {app.name}
      </Link>

      <h2 className="text-2xl font-bold text-foreground mb-6">Settings</h2>

      <div className="space-y-8">
        {/* General */}
        <section className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">General</h3>
          <form onSubmit={handleSave} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">App Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">VAPID Subject</label>
              <input
                value={vapidSubject}
                onChange={(e) => setVapidSubject(e.target.value)}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </section>

        {/* Server URL */}
        <section className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">Server URL</h3>
          <p className="text-sm text-muted-foreground mb-3">Base URL of the push notification server for client API calls.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-background rounded-lg border border-border px-3 py-2 text-xs text-foreground font-mono break-all">
              {window.location.origin}
            </code>
            <button
              onClick={() => copyToClipboard(window.location.origin, 'serverurl')}
              className="shrink-0 h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              {copiedId === 'serverurl' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </section>

        {/* App ID */}
        <section className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">App ID</h3>
          <p className="text-sm text-muted-foreground mb-3">Use this ID in your client app to identify this application when calling the API.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-background rounded-lg border border-border px-3 py-2 text-xs text-foreground font-mono break-all">
              {app.id}
            </code>
            <button
              onClick={() => copyToClipboard(app.id, 'appid')}
              className="shrink-0 h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              {copiedId === 'appid' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </section>

        {/* VAPID Public Key */}
        <section className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">VAPID Public Key</h3>
          <p className="text-sm text-muted-foreground mb-3">Use this key on the client side to subscribe to push notifications.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-background rounded-lg border border-border px-3 py-2 text-xs text-foreground font-mono break-all">
              {app.vapidPublicKey}
            </code>
            <button
              onClick={() => copyToClipboard(app.vapidPublicKey, 'vapid')}
              className="shrink-0 h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              {copiedId === 'vapid' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </section>

        {/* API Keys */}
        <section className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">API Keys</h3>
            <button
              onClick={() => setShowCreateKey(true)}
              className="flex items-center gap-2 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Create Key
            </button>
          </div>

          {apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API keys yet.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Prefix</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Label</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Last Used</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((key) => (
                    <tr key={key.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 font-mono text-xs text-foreground">{key.keyPrefix}...</td>
                      <td className="px-4 py-2 text-foreground">{key.label}</td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        {key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Never'}
                      </td>
                      <td className="px-4 py-2">
                        {key.revoked ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">Revoked</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">Active</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {!key.revoked && (
                          <button
                            onClick={() => setShowRevokeKey(key.id)}
                            className="text-muted-foreground hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Danger Zone */}
        <section className="bg-card rounded-xl border border-destructive/30 p-6">
          <h3 className="text-lg font-semibold text-destructive mb-2">Danger Zone</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete this application and all its data. This action cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteApp(true)}
            className="h-9 px-4 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors"
          >
            Delete Application
          </button>
        </section>
      </div>

      {/* Create API Key Dialog */}
      {showCreateKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Create API Key</h3>
              <button onClick={() => setShowCreateKey(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateKey} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Label</label>
                <input
                  value={keyLabel}
                  onChange={(e) => setKeyLabel(e.target.value)}
                  placeholder="Production key"
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateKey(false)}
                  className="h-9 px-4 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingKey}
                  className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {creatingKey ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Show New Key Dialog */}
      {newKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">API Key Created</h3>
              <button onClick={() => setNewKey(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
                <p className="text-xs text-yellow-400">Copy this key now. You won't be able to see it again.</p>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-background rounded-lg border border-border px-3 py-2 text-xs text-foreground font-mono break-all">
                  {newKey.key}
                </code>
                <button
                  onClick={() => copyToClipboard(newKey.key, 'newkey')}
                  className="shrink-0 h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedId === 'newkey' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={() => setNewKey(null)}
                className="w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Key Confirm Dialog */}
      {showRevokeKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-foreground mb-2">Revoke API Key</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This key will immediately stop working. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRevokeKey(null)}
                className="h-9 px-4 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRevokeKey(showRevokeKey)}
                className="h-9 px-4 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors"
              >
                Revoke
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete App Confirm Dialog */}
      {showDeleteApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-destructive mb-2">Delete Application</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will permanently delete <strong className="text-foreground">{app.name}</strong> and all its data including subscribers, API keys, and notification logs.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteApp(false)}
                className="h-9 px-4 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteApp}
                disabled={deleting}
                className="h-9 px-4 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
