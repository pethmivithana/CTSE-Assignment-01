import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const typeAccent = (type) => {
  const t = String(type || '');
  if (t.includes('PAYMENT')) return 'from-amber-50 to-orange-50 border-amber-200 text-amber-900';
  if (t.includes('ORDER') || t.includes('RIDER') || t.includes('DELIVERY')) return 'from-sky-50 to-primary-50 border-sky-200 text-slate-800';
  return 'from-slate-50 to-gray-50 border-gray-200 text-slate-800';
};

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState('all');
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const [listRes, prefRes] = await Promise.all([
        api.getNotifications(1, 50),
        api.getNotificationPreferences().catch(() => null),
      ]);
      setItems(listRes.notifications || []);
      setUnreadCount(listRes.unreadCount ?? 0);
      if (prefRes) setPrefs(prefRes);
    } catch (e) {
      setError(e.message || 'Could not load notifications');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered =
    tab === 'unread' ? items.filter((n) => !n.readAt) : items;

  const markRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setItems((prev) => prev.map((n) => (n._id === id ? { ...n, readAt: new Date().toISOString() } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      setError(e.message);
    }
  };

  const markAll = async () => {
    try {
      await api.markAllNotificationsRead();
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const savePrefs = async (patch) => {
    setPrefsLoading(true);
    try {
      const next = { ...prefs, ...patch };
      const saved = await api.updateNotificationPreferences(next);
      setPrefs(saved.preferences || saved);
    } catch (e) {
      setError(e.message);
    } finally {
      setPrefsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-gray-500">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-gray-600 mb-4">Sign in to view notifications.</p>
        <Link to="/profile" className="btn-primary inline-block">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <Link to="/profile" className="text-sm text-primary-600 hover:text-primary-700 mb-2 inline-block">
            ← Profile
          </Link>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">Orders, payments, and delivery updates in one place.</p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAll}
            className="text-sm font-semibold text-primary-600 hover:text-primary-800 px-4 py-2 rounded-xl border border-primary-200 bg-primary-50"
          >
            Mark all read
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex justify-between gap-4">
          <span>{error}</span>
          <button type="button" className="font-semibold underline" onClick={() => setError('')}>
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setTab('all')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === 'all' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setTab('unread')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === 'unread' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
              }`}
            >
              Unread {unreadCount > 0 ? `(${unreadCount})` : ''}
            </button>
          </div>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-100 rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="card p-12 text-center text-gray-500 border-dashed">
              <p className="font-medium text-gray-700">You&apos;re all caught up</p>
              <p className="text-sm mt-2">New alerts for orders and payments will show up here.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {filtered.map((n) => (
                <li
                  key={n._id}
                  className={`card p-5 border bg-gradient-to-br ${typeAccent(n.type)} ${
                    !n.readAt ? 'ring-2 ring-primary-200' : 'opacity-95'
                  }`}
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{n.type}</p>
                      <h2 className="font-semibold text-lg text-gray-900">{n.title}</h2>
                      {n.body && <p className="text-sm text-gray-600 mt-2 leading-relaxed">{n.body}</p>}
                      <p className="text-xs text-gray-400 mt-3">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!n.readAt && (
                      <button
                        type="button"
                        onClick={() => markRead(n._id)}
                        className="shrink-0 h-9 px-3 rounded-lg bg-white/80 border border-gray-200 text-sm font-medium text-gray-700 hover:bg-white"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card p-6 border border-gray-100 shadow-sm">
            <h3 className="font-display font-bold text-gray-900 mb-1">Notification preferences</h3>
            <p className="text-xs text-gray-500 mb-4">Control how we reach you. In-app alerts are always stored here.</p>
            {prefs ? (
              <div className="space-y-4">
                {[
                  { key: 'email', label: 'Email', desc: 'Order & payment emails' },
                  { key: 'push', label: 'Push', desc: 'Browser / device push (when enabled)' },
                  { key: 'orderUpdates', label: 'Order updates', desc: 'Status changes' },
                  { key: 'deliveryAlerts', label: 'Delivery & rider', desc: 'En route, pickup, arrival' },
                  { key: 'paymentAlerts', label: 'Payments', desc: 'Success & failure receipts' },
                  { key: 'marketing', label: 'Offers & tips', desc: 'Optional promotions' },
                ].map((row) => (
                  <label key={row.key} className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      checked={!!prefs[row.key]}
                      disabled={prefsLoading}
                      onChange={(e) => savePrefs({ [row.key]: e.target.checked })}
                    />
                    <span>
                      <span className="font-medium text-gray-800 group-hover:text-gray-900">{row.label}</span>
                      <span className="block text-xs text-gray-500">{row.desc}</span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Loading preferences…</p>
            )}
          </div>
          <div className="rounded-2xl bg-gray-900 text-gray-100 p-5 text-sm">
            <p className="font-semibold text-white mb-1">Tip</p>
            <p className="text-gray-300 leading-relaxed">
              For instant delivery updates, keep <strong>Order updates</strong> and <strong>Push</strong> on. You can
              turn off marketing anytime.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
