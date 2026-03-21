import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('users'); // 'users' | 'coupons'
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('pending'); // 'pending' | 'all'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approveModal, setApproveModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [couponForm, setCouponForm] = useState({ code: '', discountType: 'PERCENTAGE', discountValue: 10, minOrderAmount: 0, validUntil: '', usageLimit: '' });

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
  const displayUsers =
    filter === 'pending'
      ? pendingUsers
      : [...pendingUsers, ...nonAdminUsers.filter((u) => !needsApproval(u))];

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
    }
  }, [user, navigate]);

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
    <div className="min-h-screen bg-surface-50 py-8">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-display font-bold text-gray-800 mb-2">Admin Dashboard</h1>
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setTab('users')}
            className={`px-4 py-2 rounded-lg font-medium ${tab === 'users' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Users
          </button>
          <button
            onClick={() => setTab('coupons')}
            className={`px-4 py-2 rounded-lg font-medium ${tab === 'coupons' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Coupons
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
            <div className="card p-6">
              <h2 className="text-lg font-display font-semibold text-gray-800 mb-4">Create Coupon</h2>
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
                  <button type="submit" className="btn-primary">Create Coupon</button>
                </div>
              </form>
            </div>
            <div className="card overflow-hidden">
              <h2 className="p-4 font-display font-semibold text-gray-800 border-b">Active Coupons</h2>
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
                      <tr key={c._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{c.code}</td>
                        <td className="py-3 px-4">{c.discountType}</td>
                        <td className="py-3 px-4">{c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `$${c.discountValue}`}</td>
                        <td className="py-3 px-4">{c.usedCount} {c.usageLimit ? `/ ${c.usageLimit}` : ''}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{new Date(c.validUntil).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {coupons.length === 0 && <div className="py-12 text-center text-gray-500">No coupons yet</div>}
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

        {tab === 'users' && <div className="flex flex-wrap items-center gap-2 mb-6">
          <button
            onClick={() => setFilter('pending')}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'pending' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Pending ({pendingUsers.length})
          </button>
          <button
            onClick={() => setFilter('all')}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Users ({nonAdminUsers.length})
          </button>
          <button
            onClick={() => fetchUsers()}
            disabled={loading}
            className="ml-auto px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>}

        {tab === 'users' && <div className="card overflow-hidden">
          <div className="w-full overflow-visible">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-4 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Name</th>
                  <th className="py-4 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Email</th>
                  <th className="py-4 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Contact</th>
                  <th className="py-4 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Role</th>
                  <th className="py-4 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Details</th>
                  <th className="py-4 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Registered</th>
                  <th className="py-4 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="py-4 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-4 font-medium text-gray-800 whitespace-nowrap">{u.fullName}</td>
                    <td className="py-4 px-4 text-gray-600 break-all min-w-0">{u.email}</td>
                    <td className="py-4 px-4 text-gray-600 whitespace-nowrap">{u.contactNumber}</td>
                    <td className="py-4 px-4">
                      <span className="capitalize text-gray-600 whitespace-nowrap">{u.role?.replace(/([A-Z])/g, ' $1').trim()}</span>
                    </td>
                    <td className="py-4 px-4 text-gray-600 text-sm min-w-0">
                      {u.role === 'restaurantManager' && u.restaurantInfo?.name
                        ? <span title={u.restaurantInfo?.address} className="break-words">{u.restaurantInfo.name}</span>
                        : u.role === 'deliveryPerson' && u.driverProfile?.vehicleType
                        ? <span>{u.driverProfile.vehicleType}</span>
                        : <span className="text-gray-400">—</span>}
                    </td>
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
            <div className="py-16 text-center text-gray-500">
              {filter === 'pending'
                ? 'No pending approvals. New restaurant managers and delivery persons will appear here after they register.'
                : 'No users found.'}
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
