import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const FavoritesPage = () => {
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
      const data = await api.getFavoriteFoods();
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load favorites');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (menuItemId) => {
    try {
      await api.removeFavoriteFood(menuItemId);
      setList((prev) => prev.filter((f) => f.menuItemId !== menuItemId));
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
      <h1 className="text-2xl font-display font-bold text-gray-800 mb-2">Favorite Foods</h1>
      <p className="text-gray-500 text-sm mb-6">Foods you&apos;ve marked as favorites.</p>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : list.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-500 mb-4">You haven&apos;t added any favorite foods yet.</p>
          <button onClick={() => navigate('/restaurants')} className="btn-primary">
            Browse Restaurants
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((item) => (
            <div key={item.menuItemId} className="card p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-800">{item.name || 'Food item'}</h3>
                {item.restaurantId && (
                  <button
                    onClick={() => navigate(`/restaurants/${item.restaurantId}`)}
                    className="text-sm text-primary-600 hover:text-primary-700 mt-1"
                  >
                    View restaurant →
                  </button>
                )}
              </div>
              <button
                onClick={() => handleRemove(item.menuItemId)}
                className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                title="Remove"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
