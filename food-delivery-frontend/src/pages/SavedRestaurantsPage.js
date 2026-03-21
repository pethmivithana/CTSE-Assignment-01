import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const SavedRestaurantsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState([]);
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
      const data = await api.getSavedRestaurants();
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load saved restaurants');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (restaurantId) => {
    try {
      await api.removeSavedRestaurant(restaurantId);
      setList((prev) => prev.filter((r) => r.restaurantId !== restaurantId));
    } catch (err) {
      setError(err.message || 'Failed to remove');
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
      <h1 className="text-2xl font-display font-bold text-gray-800 mb-2">Saved Restaurants</h1>
      <p className="text-gray-500 text-sm mb-6">Restaurants you&apos;ve saved for quick access.</p>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : list.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-500 mb-4">You haven&apos;t saved any restaurants yet.</p>
          <button onClick={() => navigate('/restaurants')} className="btn-primary">
            Browse Restaurants
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((item) => (
            <div key={item.restaurantId} className="card p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-800">{item.name || 'Restaurant'}</h3>
                {item.restaurantId && (
                  <button
                    onClick={() => navigate(`/restaurants/${item.restaurantId}`)}
                    className="text-sm text-primary-600 hover:text-primary-700 mt-1"
                  >
                    View details →
                  </button>
                )}
              </div>
              <button
                onClick={() => handleRemove(item.restaurantId)}
                className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                title="Remove"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedRestaurantsPage;
