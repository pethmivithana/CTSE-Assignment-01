import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const RestaurantDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('orders');
  const [restaurant, setRestaurant] = useState(null);
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [firstLoginNotice, setFirstLoginNotice] = useState('');

  useEffect(() => {
    if (user && user.role === 'restaurantManager') {
      loadData();
    } else if (user && user.role !== 'restaurantManager') {
      navigate('/');
    }
  }, [user, navigate, activeTab]);

  const loadData = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const rest = await api.getMyRestaurant();
      setRestaurant(rest);
      if (rest) {
        const [ordersRes, analyticsRes, categoriesRes, itemsRes, reviewsRes] = await Promise.all([
          api.getRestaurantOrders().catch(() => []),
          api.getMyRestaurantAnalytics().catch(() => null),
          api.getCategories(rest._id).catch(() => []),
          api.getMenuItems({ restaurantId: rest._id }).catch(() => []),
          api.getRestaurantReviews(rest._id).catch(() => []),
        ]);
        setOrders(Array.isArray(ordersRes) ? ordersRes : ordersRes?.data || []);
        setAnalytics(analyticsRes);
        setCategories(Array.isArray(categoriesRes) ? categoriesRes : categoriesRes?.data || []);
        setMenuItems(Array.isArray(itemsRes) ? itemsRes : itemsRes?.data || []);
        setReviews(Array.isArray(reviewsRes) ? reviewsRes : reviewsRes?.items || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'restaurantManager') return undefined;
    const shouldAutoRefresh = activeTab === 'orders' || activeTab === 'analytics';
    if (!shouldAutoRefresh) return undefined;
    const id = setInterval(() => {
      loadData({ silent: true }).catch(() => {});
    }, activeTab === 'orders' ? 7000 : 15000);
    return () => clearInterval(id);
  }, [user, activeTab]);

  useEffect(() => {
    if (!user || user.role !== 'restaurantManager') return;
    const msg = sessionStorage.getItem('postFirstRoleLoginMessage');
    if (!msg) return;
    setFirstLoginNotice(msg);
    sessionStorage.removeItem('postFirstRoleLoginMessage');
  }, [user]);

  const handleCreateRestaurant = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.createMyRestaurant();
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to create restaurant');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || (user && user.role !== 'restaurantManager')) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }
  if (!user) {
    navigate('/');
    return null;
  }

  const tabs = [
    { id: 'orders', label: 'Orders', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { id: 'profile', label: 'Profile', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 8h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { id: 'menu', label: 'Menu', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { id: 'analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  ];

  return (
    <div className="dashboard-shell">
      <div className="w-full min-w-0 mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
        <div className="glass-panel p-5 md:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="dashboard-title">Restaurant Dashboard</h1>
            <p className="dashboard-subtitle">{restaurant?.name || (loading ? 'Loading...' : 'Your restaurant')}</p>
          </div>
          {restaurant && (
            <OpenCloseToggle restaurant={restaurant} onUpdate={loadData} />
          )}
        </div>

        {firstLoginNotice && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start justify-between gap-3">
            <p className="text-sm">{firstLoginNotice}</p>
            <button type="button" className="text-emerald-700 hover:text-emerald-900" onClick={() => setFirstLoginNotice('')}>×</button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-medium">We couldn't load your restaurant</p>
              <p className="text-sm text-amber-800 mt-1">{error}</p>
              <p className="text-sm text-amber-700 mt-2">
                If you were recently approved, click &quot;Create Restaurant&quot; to set up your dashboard. Otherwise ensure all backend services are running.
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={handleCreateRestaurant} className="px-4 py-2 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 text-sm whitespace-nowrap">
                Create Restaurant
              </button>
              <button onClick={() => { setError(null); loadData(); }} className="px-4 py-2 rounded-lg bg-amber-100 text-amber-900 font-medium hover:bg-amber-200 text-sm whitespace-nowrap">
                Retry
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === t.id ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={t.icon} />
              </svg>
              {t.id === 'orders' && orders.filter((o) => o.status === 'CREATED' || o.status === 'PENDING').length > 0 && (
                <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">
                  {orders.filter((o) => o.status === 'CREATED' || o.status === 'PENDING').length}
                </span>
              )}
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="card p-12 text-center text-gray-500">Loading...</div>
        ) : activeTab === 'orders' ? (
          <OrdersTab orders={orders} onUpdate={loadData} />
        ) : activeTab === 'profile' ? (
          <ProfileTab restaurant={restaurant} onUpdate={loadData} />
        ) : activeTab === 'menu' ? (
          <MenuTab restaurant={restaurant} categories={categories} menuItems={menuItems} onUpdate={loadData} />
        ) : (
          <AnalyticsTab analytics={analytics} reviews={reviews} />
        )}
      </div>
    </div>
  );
};

function OpenCloseToggle({ restaurant, onUpdate }) {
  const [toggling, setToggling] = useState(false);
  const isOpen = restaurant?.isOpen ?? true;
  const handleToggle = async () => {
    setToggling(true);
    try {
      await api.updateMyRestaurantAvailability(!isOpen);
      onUpdate();
    } catch (err) {
      alert(err.message || 'Failed to update');
    } finally {
      setToggling(false);
    }
  };
  return (
    <div className="flex items-center gap-3">
      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'}`}>
        <span className={`w-2.5 h-2.5 rounded-full ${isOpen ? 'bg-emerald-500' : 'bg-gray-500'}`} />
        {isOpen ? 'Open for orders' : 'Closed'}
      </span>
      <button
        onClick={handleToggle}
        disabled={toggling}
        className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${isOpen ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}
      >
        {toggling ? 'Updating...' : isOpen ? 'Close now' : 'Open now'}
      </button>
    </div>
  );
}

const ORDER_STATUS_TABS = [
  { id: 'all', label: 'All', statuses: null },
  { id: 'pending', label: 'New', statuses: ['CREATED', 'PENDING'] },
  {
    id: 'active',
    label: 'In progress',
    statuses: ['CONFIRMED', 'ACCEPTED', 'PREPARING', 'READY', 'PICKED_UP', 'OUT_FOR_DELIVERY'],
  },
  { id: 'delivered', label: 'Delivered', statuses: ['DELIVERED'] },
  { id: 'cancelled', label: 'Cancelled', statuses: ['CANCELLED'] },
];

const isAwaitingRestaurant = (s) => s === 'CREATED' || s === 'PENDING';

function OrdersTab({ orders, onUpdate }) {
  const [updating, setUpdating] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [prepTimeModal, setPrepTimeModal] = useState(null);
  const [statusTab, setStatusTab] = useState('all');

  const handleStatusUpdate = async (orderId, status, estimatedPreparationTime, rejectionReason) => {
    setUpdating(orderId);
    try {
      await api.updateOrderStatus(orderId, status, estimatedPreparationTime, rejectionReason);
      onUpdate();
      setRejectModal(null);
      setPrepTimeModal(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const getItemImageUrl = (item) => {
    const img = item?.imageUrl || item?.image;
    if (!img) return null;
    if (img.startsWith('http')) return img;
    return `${API_URL}/api/uploads/${img}`;
  };

  const getOrderItemImages = (items) => {
    if (!items?.length) return [];
    return items.map(getItemImageUrl).filter(Boolean);
  };

  const getStatusConfig = (status) => {
    const map = {
      CREATED: { label: 'New', class: 'bg-red-100 text-red-800', needsAction: true },
      PENDING: { label: 'New', class: 'bg-red-100 text-red-800', needsAction: true },
      CONFIRMED: { label: 'Confirmed', class: 'bg-blue-100 text-blue-800', needsAction: false },
      ACCEPTED: { label: 'Confirmed', class: 'bg-blue-100 text-blue-800', needsAction: false },
      PREPARING: { label: 'Preparing', class: 'bg-indigo-100 text-indigo-800', needsAction: false },
      READY: { label: 'Ready', class: 'bg-green-100 text-green-800', needsAction: false },
      PICKED_UP: { label: 'Picked up', class: 'bg-violet-100 text-violet-800', needsAction: false },
      OUT_FOR_DELIVERY: { label: 'On the way', class: 'bg-violet-100 text-violet-800', needsAction: false },
      DELIVERED: { label: 'Delivered', class: 'bg-gray-100 text-gray-700', needsAction: false },
      CANCELLED: { label: 'Cancelled', class: 'bg-red-100 text-red-800', needsAction: false },
    };
    return map[status] || { label: status, class: 'bg-gray-100 text-gray-600', needsAction: false };
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const getTabCount = (tab) => {
    if (!tab.statuses) return orders.length;
    return orders.filter((o) => tab.statuses.includes(o.status)).length;
  };

  const displayOrders = [...orders]
    .filter((o) => {
      const tab = ORDER_STATUS_TABS.find((t) => t.id === statusTab);
      if (!tab || !tab.statuses) return true;
      return tab.statuses.includes(o.status);
    })
    .sort((a, b) => {
      const aNew = isAwaitingRestaurant(a.status) ? 1 : 0;
      const bNew = isAwaitingRestaurant(b.status) ? 1 : 0;
      if (bNew !== aNew) return bNew - aNew;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-200">
        {ORDER_STATUS_TABS.map((tab) => {
          const count = getTabCount(tab);
          const isActive = statusTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors ${
                isActive ? 'bg-white border border-b-0 border-gray-200 -mb-px text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-600'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {displayOrders.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <p className="text-gray-600 font-medium">{statusTab === 'all' && orders.length === 0 ? 'No orders yet' : `No ${ORDER_STATUS_TABS.find((t) => t.id === statusTab)?.label?.toLowerCase() || ''} orders`}</p>
          <p className="text-gray-500 text-sm mt-1">{statusTab === 'all' && orders.length === 0 ? 'Orders will appear here when customers place them' : 'Try another status tab'}</p>
        </div>
      ) : (
        displayOrders.map((o) => {
          const statusCfg = getStatusConfig(o.status);
          const imgUrls = getOrderItemImages(o.items);
          const displayUrls = imgUrls.length > 0 ? imgUrls.slice(0, 4) : null;
          const isUpdating = updating === o._id;

          return (
            <div
              key={o._id}
              className={`card overflow-hidden transition-all ${isAwaitingRestaurant(o.status) ? 'ring-2 ring-red-300 bg-red-50' : ''}`}
            >
              <div className="flex flex-col sm:flex-row">
                <div className="sm:w-36 min-h-[120px] sm:min-h-[140px] bg-gray-100 flex-shrink-0 flex items-center justify-center p-2 overflow-hidden relative">
                  {displayUrls ? (
                    <div className={`grid w-full h-full gap-0.5 ${displayUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {displayUrls.map((url, i) => (
                        <div key={i} className="aspect-square rounded-md overflow-hidden bg-white">
                          <img src={url} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200'; }} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  )}
                  {imgUrls.length > 4 && (
                    <div className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-xs px-2 py-0.5 rounded">+{imgUrls.length - 4}</div>
                  )}
                </div>
                <div className="flex-1 p-5 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="font-semibold text-gray-900">Order #{o._id?.slice(-6).toUpperCase()}</span>
                      <span className="mx-2 text-gray-300">·</span>
                      <span className="font-medium text-gray-700">LKR {(o.totalAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAwaitingRestaurant(o.status) && (
                        <span className="px-2 py-0.5 rounded-md bg-red-200 text-red-900 text-xs font-medium">Needs response</span>
                      )}
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${statusCfg.class}`}>{statusCfg.label}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{formatDate(o.createdAt)}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {o.items?.map((item, i) => {
                      const sizeLabel = item.size ? { small: 'S', medium: 'M', large: 'L' }[item.size] || item.size : '';
                      const label = sizeLabel ? `${item.name} · ${sizeLabel}` : item.name;
                      return (
                        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-100 text-sm text-gray-700">
                          <span className="font-semibold text-primary-600">{item.quantity}×</span>
                          <span>{label}</span>
                          {item.price != null && <span className="text-xs text-gray-500">LKR {((item.price || 0) * (item.quantity || 1)).toFixed(0)}</span>}
                        </span>
                      );
                    })}
                  </div>
                  {isAwaitingRestaurant(o.status) && (
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setPrepTimeModal(o)} disabled={isUpdating} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-60">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        Accept
                      </button>
                      <button onClick={() => setRejectModal(o)} disabled={isUpdating} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 disabled:opacity-60">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        Reject
                      </button>
                    </div>
                  )}
                  {(o.status === 'CONFIRMED' || o.status === 'ACCEPTED' || o.status === 'PREPARING') && (
                    <div className="flex flex-wrap gap-2">
                      {(o.status === 'CONFIRMED' || o.status === 'ACCEPTED') && (
                        <button onClick={() => handleStatusUpdate(o._id, 'PREPARING')} disabled={isUpdating} className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600">Start preparing</button>
                      )}
                      {o.status === 'PREPARING' && (
                        <button onClick={() => handleStatusUpdate(o._id, 'READY')} disabled={isUpdating} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600">Mark ready</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}

      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setRejectModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Reject Order</h3>
            <input type="text" id="rejectReason" placeholder="Reason (optional)" className="input-field mb-4" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRejectModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => handleStatusUpdate(rejectModal._id, 'CANCELLED', null, document.getElementById('rejectReason')?.value)} className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600">Reject</button>
            </div>
          </div>
        </div>
      )}
      {prepTimeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setPrepTimeModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Accept Order – Estimated prep time (minutes)</h3>
            <input type="number" id="prepTime" placeholder="e.g. 25" min="1" className="input-field mb-4" defaultValue={25} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setPrepTimeModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => handleStatusUpdate(prepTimeModal._id, 'CONFIRMED', parseInt(document.getElementById('prepTime')?.value) || 25)} className="px-4 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600">Accept</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileTab({ restaurant, onUpdate }) {
  const [form, setForm] = useState({ name: '', description: '', deliveryRadius: 10, cuisineType: 'General', location: {}, contactInfo: {}, openingHours: {} });
  const [logoFile, setLogoFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (restaurant) {
      setForm({
        name: restaurant.name || '',
        description: restaurant.description || '',
        deliveryRadius: restaurant.deliveryRadius ?? 10,
        cuisineType: restaurant.cuisineType || 'General',
        location: restaurant.location || {},
        contactInfo: restaurant.contactInfo || {},
        openingHours: restaurant.openingHours || {},
      });
    }
  }, [restaurant]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateMyRestaurant(form);
      if (logoFile) await api.uploadRestaurantLogo(logoFile);
      onUpdate();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const logoUrl = restaurant?.logo
    ? `${API_URL}/api/uploads/${restaurant.logo}`
    : null;

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold mb-6">Restaurant Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo</label>
          {logoUrl && <img src={logoUrl} alt="Logo" className="w-24 h-24 object-cover rounded-lg mb-2" />}
          <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0])} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-field" rows="3" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Delivery Radius (km)</label>
            <input type="number" value={form.deliveryRadius} onChange={e => setForm(f => ({ ...f, deliveryRadius: Number(e.target.value) }))} className="input-field" min="1" max="50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Cuisine Type</label>
            <input value={form.cuisineType} onChange={e => setForm(f => ({ ...f, cuisineType: e.target.value }))} className="input-field" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Opening Time</label>
            <input type="time" value={form.openingHours?.open || '09:00'} onChange={e => setForm(f => ({ ...f, openingHours: { ...f.openingHours, open: e.target.value } }))} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Closing Time</label>
            <input type="time" value={form.openingHours?.close || '22:00'} onChange={e => setForm(f => ({ ...f, openingHours: { ...f.openingHours, close: e.target.value } }))} className="input-field" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
            <input value={form.location?.address || ''} onChange={e => setForm(f => ({ ...f, location: { ...f.location, address: e.target.value } }))} className="input-field" placeholder="Street address" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
            <input value={form.location?.city || ''} onChange={e => setForm(f => ({ ...f, location: { ...f.location, city: e.target.value } }))} className="input-field" placeholder="e.g. Colombo" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
            <input value={form.contactInfo?.phone || ''} onChange={e => setForm(f => ({ ...f, contactInfo: { ...f.contactInfo, phone: e.target.value } }))} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input type="email" value={form.contactInfo?.email || ''} onChange={e => setForm(f => ({ ...f, contactInfo: { ...f.contactInfo, email: e.target.value } }))} className="input-field" />
          </div>
        </div>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
      </form>
    </div>
  );
}

function MenuTab({ restaurant, categories, menuItems, onUpdate }) {
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [itemForm, setItemForm] = useState({ foodName: '', description: '', category: '', priceSmall: '', priceMedium: '', priceLarge: '', isAvailable: true, stockQuantity: '' });
  const [itemImage, setItemImage] = useState(null);
  const [priceError, setPriceError] = useState('');
  const [formError, setFormError] = useState('');

  const cats = categories.length ? categories : [...new Set(menuItems.map(i => i.category).filter(Boolean))].map(c => ({ _id: c, name: c }));
  const hasCategories = cats.length > 0;
  const showAllItems = selectedCategoryId === 'all';
  const selectedCategory = showAllItems ? null : (cats.find(c => c._id === selectedCategoryId || c.name === selectedCategoryId) || cats[0]);
  const filteredItems = showAllItems
    ? menuItems
    : selectedCategory
      ? menuItems.filter(i => i.category === selectedCategory.name || (selectedCategory._id && i.categoryId === selectedCategory._id))
      : menuItems;

  const handleAddCategory = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await api.createCategory({ restaurantId: restaurant._id, name: categoryForm.name.trim(), description: categoryForm.description?.trim() || '' });
      setCategoryForm({ name: '', description: '' });
      setShowCategoryModal(false);
      onUpdate();
    } catch (err) {
      setFormError(err.message || 'Failed to add category');
    }
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!editingCategory) return;
    try {
      await api.updateCategory(editingCategory._id, { name: categoryForm.name.trim(), description: categoryForm.description?.trim() || '' });
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '' });
      onUpdate();
    } catch (err) {
      setFormError(err.message || 'Failed to update category');
    }
  };

  const handleDeleteCategory = async (id) => {
    const cat = categories.find(c => c._id === id);
    const itemCount = menuItems.filter(i => i.category === cat?.name).length;
    if (itemCount > 0 && !window.confirm(`"${cat?.name}" has ${itemCount} item(s). Delete anyway? Items will need a new category.`)) return;
    else if (!window.confirm('Delete this category?')) return;
    try {
      await api.deleteCategory(id);
      if (selectedCategoryId === id) setSelectedCategoryId('all');
      onUpdate();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    const prices = {
      small: itemForm.priceSmall ? Number(itemForm.priceSmall) : undefined,
      medium: itemForm.priceMedium ? Number(itemForm.priceMedium) : undefined,
      large: itemForm.priceLarge ? Number(itemForm.priceLarge) : undefined,
    };
    const hasMainPrices = prices.small || prices.medium || prices.large;
    if (!hasMainPrices) {
      setPriceError('Add at least one price (Small, Medium, or Large)');
      return;
    }
    setPriceError('');
    try {
      const selectedCat = categories.find(c => c.name === itemForm.category);
      const payload = {
        restaurantId: restaurant._id,
        restaurantName: restaurant.name,
        foodName: itemForm.foodName,
        description: itemForm.description || '',
        category: itemForm.category,
        prices: JSON.stringify(prices),
        price: prices.small ?? prices.medium ?? prices.large ?? 0,
        isAvailable: itemForm.isAvailable,
      };
      if (itemForm.stockQuantity !== '' && itemForm.stockQuantity != null) payload.stockQuantity = Number(itemForm.stockQuantity);
      if (selectedCat?._id) payload.categoryId = selectedCat._id;
      await api.createMenuItem(payload, itemImage);
      setItemForm({ foodName: '', category: '', priceSmall: '', priceMedium: '', priceLarge: '', isAvailable: true });
      setItemImage(null);
      setShowItemModal(false);
      onUpdate();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    setPriceError('');
    const prices = {
      small: itemForm.priceSmall ? Number(itemForm.priceSmall) : undefined,
      medium: itemForm.priceMedium ? Number(itemForm.priceMedium) : undefined,
      large: itemForm.priceLarge ? Number(itemForm.priceLarge) : undefined,
    };
    const hasMainPrices = prices.small || prices.medium || prices.large;
    if (!hasMainPrices) {
      setPriceError('Add at least one price (Small, Medium, or Large)');
      return;
    }
    try {
      const payload = {
        foodName: itemForm.foodName,
        description: itemForm.description || '',
        category: itemForm.category,
        prices: JSON.stringify(prices),
        price: prices.small ?? prices.medium ?? prices.large ?? 0,
        isAvailable: itemForm.isAvailable,
      };
      if (itemForm.stockQuantity !== '' && itemForm.stockQuantity != null) payload.stockQuantity = Number(itemForm.stockQuantity);
      await api.updateMenuItem(editingItem._id, payload, itemImage);
      setEditingItem(null);
      setItemForm({ foodName: '', description: '', category: '', priceSmall: '', priceMedium: '', priceLarge: '', isAvailable: true, stockQuantity: '' });
      onUpdate();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await api.deleteMenuItem(id);
      onUpdate();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleStock = async (item) => {
    try {
      await api.updateMenuItemStock(item._id, !item.isOutOfStock);
      onUpdate();
    } catch (err) {
      alert(err.message);
    }
  };

  const openAddItem = () => {
    setEditingItem(null);
    setPriceError('');
    setItemForm({ foodName: '', description: '', category: selectedCategory?.name || cats[0]?.name || '', priceSmall: '', priceMedium: '', priceLarge: '', isAvailable: true, stockQuantity: '' });
    setShowItemModal(true);
  };

  const openEditItem = (item) => {
    const p = item.prices || {};
    const hasSizes = p.small != null || p.medium != null || p.large != null;
    const legacy = !hasSizes && item.price != null ? item.price : '';
    setItemForm({ foodName: item.foodName, description: item.description || '', category: item.category, priceSmall: p.small != null ? p.small : legacy, priceMedium: p.medium != null ? p.medium : legacy, priceLarge: p.large != null ? p.large : legacy, isAvailable: item.isAvailable, stockQuantity: item.stockQuantity ?? '' });
    setEditingItem(item);
    setPriceError('');
    setShowItemModal(true);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
      {/* Categories sidebar */}
      <div className="lg:w-72 flex-shrink-0">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Categories</h3>
            <button onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', description: '' }); setFormError(''); setShowCategoryModal(true); }} className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              Add
            </button>
          </div>
          <div className="max-h-[320px] overflow-y-auto">
            {categories.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500 text-sm mb-3">No categories yet.</p>
                <button onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', description: '' }); setFormError(''); setShowCategoryModal(true); }} className="text-sm text-primary-600 font-medium hover:underline">Create your first category</button>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                <li className={`flex items-center gap-2 px-4 py-3 cursor-pointer transition-colors ${showAllItems ? 'bg-primary-50' : 'hover:bg-gray-50'}`}>
                  <button type="button" onClick={() => setSelectedCategoryId('all')} className="flex-1 min-w-0 text-left">
                    <span className="font-medium text-gray-900 block">All items</span>
                    <span className="text-xs text-gray-500">{menuItems.length} total</span>
                  </button>
                </li>
                {categories.map((c) => {
                  const count = menuItems.filter(i => i.category === c.name).length;
                  const isSelected = selectedCategoryId === c._id || (selectedCategory?.name === c.name && !showAllItems);
                  return (
                    <li key={c._id} className={`group flex items-center justify-between gap-2 px-4 py-3 cursor-pointer transition-colors ${isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'}`}>
                      <button type="button" onClick={() => setSelectedCategoryId(c._id)} className="flex-1 min-w-0 text-left">
                        <span className="font-medium text-gray-900 block truncate">{c.name}</span>
                        <span className="text-xs text-gray-500">{count} item{count !== 1 ? 's' : ''}</span>
                      </button>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setEditingCategory(c); setCategoryForm({ name: c.name, description: c.description || '' }); setFormError(''); }} className="p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-primary-50" title="Edit category">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteCategory(c._id); }} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50" title="Delete category">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Items panel */}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-800">{selectedCategory ? `${selectedCategory.name} • ${filteredItems.length} item${filteredItems.length !== 1 ? 's' : ''}` : 'All items'}</h3>
              <p className="text-sm text-gray-500 mt-0.5">Manage menu items in this category</p>
            </div>
            <button onClick={openAddItem} disabled={!hasCategories} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 text-white font-medium text-sm hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              Add item
            </button>
          </div>
          <div className="p-4 sm:p-5">
            {filteredItems.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <p className="text-gray-600 font-medium">No items yet</p>
                <p className="text-gray-500 text-sm mt-1">{hasCategories ? 'Add your first item to this category' : 'Create a category first, then add items'}</p>
                {hasCategories && <button onClick={openAddItem} className="mt-4 text-primary-600 font-medium hover:underline">Add item</button>}
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-5">
                {filteredItems.map((item) => {
                  const p = item.prices || {};
                  const hasSizes = p.small != null || p.medium != null || p.large != null;
                  let imgSrc = item.imageUrl || item.image;
                  if (imgSrc && !imgSrc.startsWith('http')) imgSrc = `${API_URL}/api/uploads/${imgSrc}`;
                  if (!imgSrc) imgSrc = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200';
                  return (
                    <div
                      key={item._id}
                      className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all"
                    >
                      <div className="flex-shrink-0 flex items-center gap-4 sm:w-48">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                          <img src={imgSrc} alt={item.foodName} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 sm:hidden">
                          <h4 className="font-semibold text-gray-900 truncate">{item.foodName}</h4>
                          {!selectedCategory && <p className="text-sm text-gray-500">{item.category}</p>}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="hidden sm:block">
                            <h4 className="font-semibold text-gray-900">{item.foodName}</h4>
                            {!selectedCategory && <p className="text-sm text-gray-500 mt-0.5">{item.category}</p>}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => handleToggleStock(item)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${item.isOutOfStock ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                            >
                              <span className={`w-2 h-2 rounded-full ${item.isOutOfStock ? 'bg-red-500' : 'bg-green-500'}`} />
                              {item.isOutOfStock ? 'Out of stock' : 'In stock'}
                            </button>
                            {item.stockQuantity != null && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium">
                                Stock: {item.stockQuantity}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {hasSizes ? (
                            <>
                              {p.small != null && <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium">S: LKR {Number(p.small).toLocaleString()}</span>}
                              {p.medium != null && <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium">M: LKR {Number(p.medium).toLocaleString()}</span>}
                              {p.large != null && <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium">L: LKR {Number(p.large).toLocaleString()}</span>}
                            </>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium">LKR {(item.price || 0).toLocaleString()}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            onClick={() => openEditItem(item)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item._id)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category modal (Add / Edit) */}
      {(showCategoryModal || editingCategory) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowCategoryModal(false); setEditingCategory(null); setFormError(''); }}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{editingCategory ? 'Edit category' : 'New category'}</h3>
            <form onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                <input value={categoryForm.name} onChange={e => setCategoryForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="e.g. Main Course, Desserts" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (optional)</label>
                <input value={categoryForm.description} onChange={e => setCategoryForm(f => ({ ...f, description: e.target.value }))} className="input-field" placeholder="Brief description" />
              </div>
              {formError && <p className="text-red-600 text-sm">{formError}</p>}
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => { setShowCategoryModal(false); setEditingCategory(null); setFormError(''); }} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editingCategory ? 'Save changes' : 'Create category'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(showItemModal || editingItem) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowItemModal(false); setEditingItem(null); setPriceError(''); }}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold text-gray-800 mb-6">{editingItem ? 'Edit menu item' : 'Add menu item'}</h3>
            <form onSubmit={editingItem ? handleUpdateItem : handleAddItem} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Item name</label>
                <input value={itemForm.foodName} onChange={e => setItemForm(f => ({ ...f, foodName: e.target.value }))} className="input-field" placeholder="e.g. Chicken Rice" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (optional)</label>
                <textarea value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} className="input-field" rows="2" placeholder="Brief description of the dish" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
              {hasCategories ? (
                <select value={itemForm.category} onChange={e => setItemForm(f => ({ ...f, category: e.target.value }))} className="input-field" required>
                  <option value="">Select category</option>
                  {cats.map(c => <option key={c._id || c.name} value={c.name}>{c.name}</option>)}
                </select>
              ) : (
                <input value={itemForm.category} onChange={e => setItemForm(f => ({ ...f, category: e.target.value }))} className="input-field" placeholder="e.g. Main Course" required />
              )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prices (LKR)</label>
                <p className="text-xs text-gray-500 mb-2">Add at least one of Small, Medium, or Large.</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Small (1)</label>
                    <input type="number" value={itemForm.priceSmall} onChange={e => { setItemForm(f => ({ ...f, priceSmall: e.target.value })); setPriceError(''); }} className="input-field" placeholder="500" min="0" step="0.01" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Medium (2)</label>
                    <input type="number" value={itemForm.priceMedium} onChange={e => { setItemForm(f => ({ ...f, priceMedium: e.target.value })); setPriceError(''); }} className="input-field" placeholder="900" min="0" step="0.01" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Large (4)</label>
                    <input type="number" value={itemForm.priceLarge} onChange={e => { setItemForm(f => ({ ...f, priceLarge: e.target.value })); setPriceError(''); }} className="input-field" placeholder="1600" min="0" step="0.01" />
                  </div>
                </div>
              </div>
              {priceError && <p className="text-red-600 text-sm">{priceError}</p>}
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={itemForm.isAvailable} onChange={e => setItemForm(f => ({ ...f, isAvailable: e.target.checked }))} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  <span className="text-sm font-medium text-gray-700">Available for ordering</span>
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Stock qty (optional)</label>
                  <input type="number" value={itemForm.stockQuantity} onChange={e => setItemForm(f => ({ ...f, stockQuantity: e.target.value }))} className="input-field w-24" placeholder="∞" min="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Image (optional)</label>
                <input type="file" accept="image/*" onChange={e => setItemImage(e.target.files?.[0])} className="block w-full text-sm text-gray-500" />
              </div>
              <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
                <button type="button" onClick={() => { setShowItemModal(false); setEditingItem(null); }} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editingItem ? 'Save changes' : 'Add item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalyticsTab({ analytics, reviews }) {
  if (!analytics) return <div className="card p-12 text-center text-gray-500">No analytics data yet</div>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="card p-6">
        <p className="text-sm text-gray-600">Today's Revenue</p>
        <p className="text-2xl font-bold text-primary-600">LKR {analytics.dailyRevenue?.toFixed(2) || 0}</p>
      </div>
      <div className="card p-6">
        <p className="text-sm text-gray-600">Weekly Revenue</p>
        <p className="text-2xl font-bold text-primary-600">LKR {analytics.weeklyRevenue?.toFixed(2) || 0}</p>
      </div>
      <div className="card p-6">
        <p className="text-sm text-gray-600">Orders Today</p>
        <p className="text-2xl font-bold">{analytics.dailyOrders || 0}</p>
      </div>
      <div className="card p-6">
        <p className="text-sm text-gray-600">Orders This Week</p>
        <p className="text-2xl font-bold">{analytics.weeklyOrders || 0}</p>
      </div>
      <div className="card p-6 col-span-full">
        <h3 className="font-semibold mb-4">Popular Items</h3>
        <ul className="space-y-2">
          {(analytics.popularItems || []).slice(0, 10).map((item, i) => (
            <li key={i} className="flex justify-between">
              <span>{item.name}</span>
              <span className="font-medium">{item.count} orders</span>
            </li>
          ))}
        </ul>
        {(!analytics.popularItems || analytics.popularItems.length === 0) && <p className="text-gray-500">No data yet</p>}
      </div>
      <div className="card p-6 col-span-full">
        <h3 className="font-semibold mb-4">Recent Customer Reviews</h3>
        {reviews?.length ? (
          <div className="space-y-3">
            {reviews.slice(0, 8).map((r) => (
              <div key={r._id} className="rounded-lg border border-gray-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-800">{r.customerName || 'Customer'}</span>
                  <span className="text-sm text-amber-600">
                    {'★'.repeat(Math.round(r.rating || 0))}{'☆'.repeat(5 - Math.round(r.rating || 0))} ({r.rating || 0})
                  </span>
                </div>
                {r.comment ? <p className="text-sm text-gray-600 mt-1">{r.comment}</p> : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No reviews yet</p>
        )}
      </div>
    </div>
  );
}

export default RestaurantDashboard;
