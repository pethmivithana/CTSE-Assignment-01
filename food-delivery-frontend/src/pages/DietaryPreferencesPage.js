import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const DietaryPreferencesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState({
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    halal: false,
    kosher: false,
    allergies: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      const data = await api.getDietaryPreferences();
      setPrefs((prev) => ({
        ...prev,
        ...(data || {}),
        allergies: data?.allergies || '',
      }));
    } catch (err) {
      setError(err.message || 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.updateDietaryPreferences(prefs);
      setSuccess('Preferences saved.');
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
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
      <h1 className="text-2xl font-display font-bold text-gray-800 mb-2">Dietary Preferences</h1>
      <p className="text-gray-500 text-sm mb-6">Tell us your dietary needs so we can better serve you.</p>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm">{success}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {['vegetarian', 'vegan', 'glutenFree', 'halal', 'kosher'].map((key) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!prefs[key]}
                onChange={(e) => handleChange(key, e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="font-medium text-gray-800 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            </label>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Allergies (optional)</label>
            <input
              type="text"
              value={prefs.allergies || ''}
              onChange={(e) => handleChange('allergies', e.target.value)}
              className="input-field"
              placeholder="e.g. nuts, shellfish"
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </form>
      )}
    </div>
  );
};

export default DietaryPreferencesPage;
