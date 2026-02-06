import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { App } from '@/lib/types';
import { ArrowLeft, Users, Settings } from 'lucide-react';
import { Toaster } from 'sonner';
import AppOverview from '@/components/apps/AppOverview';
import SendForm from '@/components/notifications/SendForm';
import SubscriberList from '@/components/apps/SubscriberList';
import LogList from '@/components/notifications/LogList';

type Tab = 'overview' | 'send' | 'subscribers' | 'logs';

export default function AppDetail() {
  const { id } = useParams<{ id: string }>();
  const [app, setApp] = useState<App | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  useEffect(() => {
    if (!id) return;
    api.get<App>(`/api/admin/apps/${id}`).then(setApp).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  if (!app) {
    return <div className="text-muted-foreground">App not found.</div>;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'send', label: 'Send' },
    { key: 'subscribers', label: 'Subscribers' },
    { key: 'logs', label: 'Logs' },
  ];

  return (
    <div>
      <Toaster theme="dark" />
      {/* Back + Header */}
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to apps
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-foreground">{app.name}</h2>
          <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            <Users className="w-3 h-3" />
            {app.subscriberCount ?? 0}
          </span>
        </div>
        <Link
          to={`/apps/${app.id}/settings`}
          className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <AppOverview appId={app.id} />}
      {activeTab === 'send' && <SendForm appId={app.id} />}
      {activeTab === 'subscribers' && <SubscriberList appId={app.id} />}
      {activeTab === 'logs' && <LogList appId={app.id} />}
    </div>
  );
}
