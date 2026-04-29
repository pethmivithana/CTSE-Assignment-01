import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('users'); // 'users' | 'coupons' | 'feedback'
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('pending'); // 'pending' | 'all'
  /** 'all' | 'customer' | 'restaurantManager' | 'deliveryPerson' */
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approveModal, setApproveModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [couponForm, setCouponForm] = useState({ code: '', discountType: 'PERCENTAGE', discountValue: 10, minOrderAmount: 0, validUntil: '', usageLimit: '' });
  const [driverFeedback, setDriverFeedback] = useState({ items: [], summary: { totalRatings: 0, averageRating: 0 } });
  const [restaurantFeedback, setRestaurantFeedback] = useState({ items: [], summary: { totalRatings: 0, averageRating: 0 } });

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('foodAppToken');
      const response = await axios.get(`${API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.status === 403
        ? 'Admin access required. Please sign in as an administrator.'
        : err.message || 'Failed to load users';
      setError(msg);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const needsApproval = (u) =>
    (u.role === 'restaurantManager' || u.role === 'deliveryPerson') && !u.isApproved;
  const nonAdminUsers = users.filter((u) => u.role !== 'admin');
  const pendingUsers = nonAdminUsers.filter(needsApproval);
  const approvedNonAdmin = nonAdminUsers.filter((u) => !needsApproval(u));

  /** Same order as before: pending first, then everyone else (when filter === 'all') */
  const orderedUsers =
    filter === 'pending' ? pendingUsers : [...pendingUsers, ...approvedNonAdmin];

  const displayUsers =
    roleFilter === 'all'
      ? orderedUsers
      : orderedUsers.filter((u) => u.role === roleFilter);

  const countRole = (role) => nonAdminUsers.filter((u) => u.role === role).length;
  const countPendingRole = (role) => pendingUsers.filter((u) => u.role === role).length;

  const roleLabel = (role) => {
    switch (role) {
      case 'customer':
        return 'Customer';
      case 'restaurantManager':
        return 'Restaurant manager';
      case 'deliveryPerson':
        return 'Delivery person';
      default:
        return role || '—';
    }
  };

  const roleBadgeClass = (role) => {
    switch (role) {
      case 'customer':
        return 'bg-slate-100 text-slate-700';
      case 'restaurantManager':
        return 'bg-orange-100 text-orange-800';
      case 'deliveryPerson':
        return 'bg-violet-100 text-violet-800';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  /** Full driver + restaurant details for the Details column */
  const renderUserDetails = (u) => {
    if (u.role === 'restaurantManager') {
      const ri = u.restaurantInfo;
      if (!ri?.name && !ri?.address) {
        return <span className="text-gray-400">—</span>;
      }
      return (
        <div className="text-sm space-y-0.5 max-w-xs">
          {ri?.name && <div className="font-medium text-gray-800">{ri.name}</div>}
          {ri?.address && <div className="text-gray-600 text-xs leading-snug">{ri.address}</div>}
          {ri?.id && <div className="text-gray-500 text-xs">ID: {ri.id}</div>}
        </div>
      );
    }
    if (u.role === 'deliveryPerson') {
      const dp = u.driverProfile || {};
      const vd = dp.vehicleDetails || {};
      return (
        <div className="text-sm space-y-1 max-w-md text-left">
          <div className="font-medium text-gray-800 border-b border-gray-100 pb-1 mb-1">Driver profile</div>
          <div>
            <span className="text-gray-500">Vehicle type: </span>
            <span className="text-gray-800">{dp.vehicleType || '—'}</span>
          </div>
          <div>
            <span className="text-gray-500">Model: </span>
            <span className="text-gray-800">{vd.model || '—'}</span>
          </div>
          <div>
            <span className="text-gray-500">License plate: </span>
            <span className="text-gray-800">{vd.licensePlate || '—'}</span>
          </div>
          <div>
            <span className="text-gray-500">Driver&apos;s license: </span>
            <span className="text-gray-800 font-mono text-xs">{dp.driverLicense || '—'}</span>
          </div>
          <div>
            <span className="text-gray-500">NIC: </span>
            <span className="text-gray-800 font-mono text-xs">{dp.nicNumber || '—'}</span>
          </div>
          <div>
            <span className="text-gray-500">Profile verified: </span>
            <span className={dp.isVerified ? 'text-green-700 font-medium' : 'text-amber-700'}>
              {dp.isVerified ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      );
    }
    if (u.role === 'customer') {
      return (
        <div className="text-sm text-gray-600 max-w-xs">
          <span className="text-gray-400">Customer account</span>
          {u.addresses?.length > 0 && (
            <div className="mt-1 text-xs text-gray-500">
              {u.addresses.length} saved address{u.addresses.length !== 1 ? 'es' : ''}
            </div>
          )}
        </div>
      );
    }
    return <span className="text-gray-400">—</span>;
  };

  const approveUser = async (userToApprove) => {
    if (!userToApprove) return;
    setApproveModal(null);
    try {
      const token = localStorage.getItem('foodAppToken');
      await axios.put(
        `${API_URL}/api/users/${userToApprove._id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve user');
    }
  };

  const createRestaurantForUser = async (u) => {
    try {
      setError(null);
      const token = localStorage.getItem('foodAppToken');
      await axios.put(
        `${API_URL}/api/users/${u._id}/create-restaurant`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create restaurant');
    }
  };

  const deleteUser = async (userToDelete) => {
    if (!userToDelete) return;
    setDeleteModal(null);
    try {
      const token = localStorage.getItem('foodAppToken');
      await axios.delete(`${API_URL}/api/users/${userToDelete._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const fetchCoupons = async () => {
    try {
      const list = await api.getCoupons();
      setCoupons(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || 'Failed to load coupons');
    }
  };

  const fetchFeedback = async () => {
    try {
      const [driverData, restaurantData] = await Promise.all([
        api.getAdminDriverFeedback().catch(() => ({ items: [], summary: { totalRatings: 0, averageRating: 0 } })),
        api.getAdminRestaurantReviews().catch(() => ({ items: [], summary: { totalRatings: 0, averageRating: 0 } })),
      ]);
      setDriverFeedback(driverData);
      setRestaurantFeedback(restaurantData);
    } catch (err) {
      setError(err.message || 'Failed to load feedback');
    }
  };

  const createCoupon = async (e) => {
    e.preventDefault();
    if (!couponForm.code || !couponForm.validUntil) return;
    setError(null);
    try {
      await api.createCoupon({
        code: couponForm.code,
        discountType: couponForm.discountType,
        discountValue: Number(couponForm.discountValue) || 0,
        minOrderAmount: Number(couponForm.minOrderAmount) || 0,
        validUntil: couponForm.validUntil,
        usageLimit: couponForm.usageLimit ? Number(couponForm.usageLimit) : null,
      });
      setCouponForm({ code: '', discountType: 'PERCENTAGE', discountValue: 10, minOrderAmount: 0, validUntil: '', usageLimit: '' });
      fetchCoupons();
    } catch (err) {
      setError(err.message || 'Failed to create coupon');
    }
  };

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
      return;
    }
    if (user?.role === 'admin') {
      fetchUsers();
      fetchCoupons();
      fetchFeedback();
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user?.role === 'admin' && tab === 'feedback') {
      fetchFeedback();
    }
  }, [tab, user]);

  const formatDate = (date) => {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (authLoading || (user && user.role !== 'admin')) {
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

  return (
    <div className="dashboard-shell">
      <div className="dashboard-container">
        <div className="glass-panel p-5 md:p-6 mb-6 md:mb-8">
          <h1 className="dashboard-title">Admin Dashboard</h1>
          <p className="dashboard-subtitle">Manage users, approvals, and coupon campaigns from one place.</p>
        </div>
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setTab('users')}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              tab === 'users'
                ? 'bg-primary-500 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setTab('coupons')}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              tab === 'coupons'
                ? 'bg-primary-500 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Coupons
          </button>
          <button
            onClick={() => setTab('feedback')}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              tab === 'feedback'
                ? 'bg-primary-500 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Feedback
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700">
            {error}
          </div>
        )}

        {loading && tab === 'users' && (
          <div className="mb-6 p-4 rounded-xl bg-gray-50 text-gray-600">Loading users...</div>
        )}

        {tab === 'coupons' && (
          <div className="space-y-6 mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="card p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Total coupons</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{coupons.length}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Active</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{coupons.filter((c) => c.isActive !== false && new Date(c.validUntil) >= new Date()).length}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Expired</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{coupons.filter((c) => new Date(c.validUntil) < new Date()).length}</p>
              </div>
            </div>
            <div className="card p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h2 className="text-lg font-display font-semibold text-gray-800 mb-1">Create Coupon</h2>
              <p className="text-sm text-gray-500 mb-4">Configure promotions across all eligible customer checkouts.</p>
              <form onSubmit={createCoupon} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                  <input
                    value={couponForm.code}
                    onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                    className="input-field"
                    placeholder="SAVE10"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={couponForm.discountType}
                    onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value })}
                    className="input-field"
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value ({couponForm.discountType === 'PERCENTAGE' ? '%' : '$'})</label>
                  <input
                    type="number"
                    value={couponForm.discountValue}
                    onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })}
                    className="input-field"
                    min="0"
                    step={couponForm.discountType === 'FIXED' ? '0.01' : '1'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Order ($)</label>
                  <input
                    type="number"
                    value={couponForm.minOrderAmount}
                    onChange={(e) => setCouponForm({ ...couponForm, minOrderAmount: e.target.value })}
                    className="input-field"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                  <input
                    type="datetime-local"
                    value={couponForm.validUntil}
                    onChange={(e) => setCouponForm({ ...couponForm, validUntil: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit (optional)</label>
                  <input
                    type="number"
                    value={couponForm.usageLimit}
                    onChange={(e) => setCouponForm({ ...couponForm, usageLimit: e.target.value })}
                    className="input-field"
                    min="1"
                    placeholder="Unlimited"
                  />
                </div>
                <div className="sm:col-span-2 flex items-end">
                  <button type="submit" className="btn-primary py-2.5">Create Coupon</button>
                </div>
              </form>
            </div>
            <div className="card overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
              <h2 className="p-4 font-display font-semibold text-gray-800 border-b bg-gray-50">Active Coupons</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Code</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Type</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Value</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Used</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map((c) => (
                      <tr key={c._id} className="border-b border-gray-100 hover:bg-gray-50/80">
                        <td className="py-3 px-4 font-medium">{c.code}</td>
                        <td className="py-3 px-4">
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{c.discountType}</span>
                        </td>
                        <td className="py-3 px-4">{c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `$${c.discountValue}`}</td>
                        <td className="py-3 px-4">{c.usedCount} {c.usageLimit ? `/ ${c.usageLimit}` : ''}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          <span className={`px-2 py-1 rounded-full text-xs ${new Date(c.validUntil) >= new Date() ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {new Date(c.validUntil) >= new Date() ? 'Active' : 'Expired'}
                          </span>
                          <span className="ml-2">{new Date(c.validUntil).toLocaleDateString()}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {coupons.length === 0 && <div className="py-12 text-center text-gray-500">No coupons yet</div>}
            </div>
          </div>
        )}

        {tab === 'feedback' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="card overflow-hidden">
              <div className="p-4 border-b bg-gray-50">
                <h2 className="font-semibold text-gray-800">Driver Ratings & Comments</h2>
                <p className="text-xs text-gray-500 mt-1">
                  {driverFeedback?.summary?.totalRatings || 0} ratings · Avg {driverFeedback?.summary?.averageRating || 0}/5
                </p>
              </div>
              <div className="max-h-[420px] overflow-y-auto divide-y">
                {(driverFeedback?.items || []).slice(0, 30).map((item) => (
                  <div key={item.deliveryId} className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-gray-800">{item.driverName}</p>
                      <p className="text-amber-600 text-sm">
                        {'★'.repeat(Math.round(item.rating || 0))}{'☆'.repeat(5 - Math.round(item.rating || 0))} ({item.rating || 0})
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Order #{String(item.orderId || '').slice(-6)}</p>
                    {item.feedback ? <p className="text-sm text-gray-600 mt-2">{item.feedback}</p> : null}
                  </div>
                ))}
                {(!driverFeedback?.items || driverFeedback.items.length === 0) && (
                  <div className="p-8 text-center text-gray-500 text-sm">No driver feedback yet.</div>
                )}
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="p-4 border-b bg-gray-50">
                <h2 className="font-semibold text-gray-800">Restaurant Ratings & Comments</h2>
                <p className="text-xs text-gray-500 mt-1">
                  {restaurantFeedback?.summary?.totalRatings || 0} ratings · Avg {restaurantFeedback?.summary?.averageRating || 0}/5
                </p>
              </div>
              <div className="max-h-[420px] overflow-y-auto divide-y">
                {(restaurantFeedback?.items || []).slice(0, 30).map((item) => (
                  <div key={item._id} className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-gray-800">{item.restaurantName}</p>
                      <p className="text-amber-600 text-sm">
                        {'★'.repeat(Math.round(item.rating || 0))}{'☆'.repeat(5 - Math.round(item.rating || 0))} ({item.rating || 0})
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">By {item.customerName || 'Customer'}</p>
                    {item.comment ? <p className="text-sm text-gray-600 mt-2">{item.comment}</p> : null}
                  </div>
                ))}
                {(!restaurantFeedback?.items || restaurantFeedback.items.length === 0) && (
                  <div className="p-8 text-center text-gray-500 text-sm">No restaurant feedback yet.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'users' && pendingUsers.length > 0 && !loading && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <p className="font-medium text-amber-800">
              {pendingUsers.length} {pendingUsers.length === 1 ? 'person' : 'people'} awaiting approval
            </p>
          </div>
        )}

        {tab === 'users' && (
          <div className="space-y-3 mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFilter('pending')}
                disabled={loading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'pending' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Pending ({pendingUsers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('all')}
                disabled={loading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === 'all' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All users ({nonAdminUsers.length})
              </button>
              <button
                type="button"
                onClick={() => fetchUsers()}
                disabled={loading}
                className="ml-auto px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
              >
                Refresh
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-full sm:w-auto sm:mr-1">
                Role
              </span>
              {[
                { key: 'all', label: 'All roles' },
                { key: 'customer', label: 'Customers' },
                { key: 'restaurantManager', label: 'Restaurant managers' },
                { key: 'deliveryPerson', label: 'Delivery persons' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRoleFilter(key)}
                  disabled={loading}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors border ${
                    roleFilter === key
                      ? 'bg-gray-800 text-white border-gray-800'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {label}
                  {key !== 'all' && (
                    <span className="ml-1 opacity-80">
                      ({countRole(key)}
                      {filter === 'pending' ? ` · ${countPendingRole(key)} pending` : ''})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'users' && <div className="card overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full table-auto min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-4 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Name</th>
                  <th className="py-4 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Email</th>
                  <th className="py-4 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Contact</th>
                  <th className="py-4 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Role</th>
                  <th className="py-4 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[280px]">Details</th>
                  <th className="py-4 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Registered</th>
                  <th className="py-4 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="py-4 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50/50 transition-colors align-top">
                    <td className="py-4 px-4 font-medium text-gray-800 whitespace-nowrap">{u.fullName}</td>
                    <td className="py-4 px-4 text-gray-600 break-all min-w-0">{u.email}</td>
                    <td className="py-4 px-4 text-gray-600 whitespace-nowrap">{u.contactNumber}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${roleBadgeClass(u.role)}`}>
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-600 text-sm min-w-0">{renderUserDetails(u)}</td>
                    <td className="py-4 px-4 text-gray-600 text-sm whitespace-nowrap">{formatDate(u.createdAt)}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${u.isApproved ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        {u.isApproved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-2 flex-wrap">
                        {!u.isApproved && (u.role === 'restaurantManager' || u.role === 'deliveryPerson') && (
                          <button onClick={() => setApproveModal(u)} className="px-3 py-1.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600">
                            Approve
                          </button>
                        )}
                        {u.isApproved && u.role === 'restaurantManager' && !u.restaurantInfo?._id && (
                          <button onClick={() => createRestaurantForUser(u)} className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600">
                            Create Restaurant
                          </button>
                        )}
                        <button onClick={() => setDeleteModal(u)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {displayUsers.length === 0 && (
            <div className="py-16 text-center text-gray-500 px-4">
              {roleFilter !== 'all' ? (
                <>
                  No users match <strong>{roleLabel(roleFilter)}</strong>
                  {filter === 'pending' ? ' in pending approvals' : ''}. Try another role or switch to{' '}
                  <button type="button" className="text-primary-600 underline" onClick={() => setRoleFilter('all')}>
                    All roles
                  </button>
                  .
                </>
              ) : filter === 'pending' ? (
                'No pending approvals. New restaurant managers and delivery persons will appear here after they register.'
              ) : (
                'No users found.'
              )}
            </div>
          )}
        </div>}
      </div>

      {/* Approve confirmation modal */}
      {approveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setApproveModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-display font-semibold text-gray-800">Approve registration</h2>
                <p className="text-gray-600 text-sm mt-0.5">This user will be able to sign in</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Approve <strong>{approveModal.fullName}</strong> ({approveModal.email})? They will receive an email notification and can start using Feedo.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setApproveModal(null)}
                className="px-5 py-2.5 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => approveUser(approveModal)}
                className="px-5 py-2.5 rounded-xl font-medium text-white bg-primary-500 hover:bg-primary-600 transition-colors"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-display font-semibold text-gray-800">Delete user</h2>
                <p className="text-gray-600 text-sm mt-0.5">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Remove <strong>{deleteModal.fullName}</strong> from Feedo? All their data will be permanently deleted.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModal(null)}
                className="px-5 py-2.5 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteUser(deleteModal)}
                className="px-5 py-2.5 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
