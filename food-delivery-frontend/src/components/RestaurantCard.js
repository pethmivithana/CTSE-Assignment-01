import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const PLACEHOLDER_IMAGES = {
  American: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
  Italian: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400',
  Japanese: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400',
  Mexican: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400',
  Thai: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400',
  Indian: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400',
};

const RestaurantCard = ({ restaurant }) => {
  const { currentTheme } = useTheme();
  const { user } = useAuth();
  const [imgError, setImgError] = React.useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const id = restaurant._id || restaurant.id;
  const name = restaurant.name || 'Restaurant';

  useEffect(() => {
    if (!user) return;
    api.getSavedRestaurants()
      .then((list) => setIsSaved((list || []).some((r) => String(r.restaurantId) === String(id))))
      .catch(() => {});
  }, [user, id]);

  const handleToggleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    setSaving(true);
    try {
      if (isSaved) {
        await api.removeSavedRestaurant(id);
        setIsSaved(false);
      } else {
        await api.addSavedRestaurant(id, name);
        setIsSaved(true);
      }
    } catch (err) {
      // ignore
    } finally {
      setSaving(false);
    }
  };
  const cuisine = restaurant.cuisineType || restaurant.cuisine || 'Food';
  const rating = restaurant.rating ?? 0;
  const address = restaurant.location?.address
    ? `${restaurant.location.address}${restaurant.location.city ? `, ${restaurant.location.city}` : ''}`
    : restaurant.address || '';
  const image = restaurant.logo && !imgError
    ? `${API_URL}/api/uploads/${restaurant.logo}`
    : restaurant.image || restaurant.imageUrl || PLACEHOLDER_IMAGES[cuisine] || PLACEHOLDER_IMAGES.American;

  return (
    <Link to={`/restaurants/${id}`} className="block group animate-fade-in">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-300 h-full">
        <div className="aspect-[4/3] overflow-hidden bg-gray-100 relative">
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            onError={() => setImgError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
            {!restaurant.isOpen && (
              <span className="px-2.5 py-1 rounded-lg bg-gray-800/90 text-white text-xs font-medium">Closed</span>
            )}
            {rating > 0 && (
              <span className={`${currentTheme.primary} text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg`}>
                ★ {rating.toFixed(1)}
              </span>
            )}
          </div>
          {user && (
            <button
              onClick={handleToggleSave}
              disabled={saving}
              className="absolute top-3 left-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors disabled:opacity-70"
              title={isSaved ? 'Remove from saved' : 'Save restaurant'}
            >
              <svg className={`w-5 h-5 ${isSaved ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          )}
        </div>
        <div className="p-5">
          <h3 className="font-display font-bold text-gray-900 text-lg leading-tight group-hover:text-primary-600 transition-colors mb-1">
            {name}
          </h3>
          <p className="text-primary-600 text-sm font-medium mb-2">{cuisine}</p>
          {address && (
            <p className="text-sm text-gray-500 line-clamp-2 flex items-start gap-1.5">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              {address}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
};

export default RestaurantCard;
