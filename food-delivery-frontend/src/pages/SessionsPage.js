import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const SessionsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/profile');
      return;
    }
    load();
  }, [user, navigate]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getSessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load sessions');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (sessionId) => {
    if (!window.confirm('Revoke this session? You will be logged out from that device.')) return;
    try {
      await api.revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => (s.id || s._id) !== sessionId));
    } catch (err) {
      setError(err.message || 'Failed to revoke');
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
      <h1 className="text-2xl font-display font-bold text-gray-800 mb-2">Active Sessions</h1>
      <p className="text-gray-500 text-sm mb-6">Devices where you&apos;re currently signed in. Revoke any session you don&apos;t recognize.</p>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : sessions.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-500">No active sessions found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <div key={s.id || s._id} className="card p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">{s.deviceInfo || s.device || s.userAgent?.slice(0, 50) || 'Unknown device'}</p>
                <p className="text-sm text-gray-500 mt-0.5">{s.ip || s.ipAddress || '—'}</p>
                {(s.createdAt || s.lastActive) && (
                  <p className="text-xs text-gray-400 mt-1">Last active: {new Date(s.createdAt || s.lastActive).toLocaleString()}</p>
                )}
              </div>
              <button
                onClick={() => handleRevoke(s.id || s._id)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SessionsPage;
