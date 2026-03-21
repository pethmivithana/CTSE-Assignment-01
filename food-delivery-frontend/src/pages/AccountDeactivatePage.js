import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const AccountDeactivatePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!user) {
    navigate('/profile');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Password is required');
      return;
    }
    if (!window.confirm('Deactivating your account will sign you out. You can reactivate later via email. Continue?')) {
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.deactivateAccount(password, reason || undefined);
      setSuccess('Account deactivated. You will be signed out.');
      setTimeout(() => logout(), 2000);
    } catch (err) {
      setError(err.message || 'Failed to deactivate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={() => navigate('/profile')} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 font-medium text-sm">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Profile
      </button>
      <h1 className="text-2xl font-display font-bold text-gray-800 mb-2">Deactivate Account</h1>
      <p className="text-gray-500 text-sm mb-6">
        Deactivating will sign you out and disable your account. You can reactivate later by requesting an OTP to your email.
      </p>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm">{success}</div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Your password (to confirm)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            placeholder="Enter password"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason (optional)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input-field"
            rows="3"
            placeholder="Why are you deactivating?"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary bg-red-600 hover:bg-red-700">
          {loading ? 'Deactivating...' : 'Deactivate Account'}
        </button>
      </form>
    </div>
  );
};

export default AccountDeactivatePage;
