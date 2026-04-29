import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import MenuItemCard from '../components/MenuItemCard';
import CategoryFilter from '../components/CategoryFilter';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const PLACEHOLDER_IMAGES = {
  American: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600',
  Italian: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600',
  Japanese: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600',
  Mexican: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600',
  Thai: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600',
  Indian: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600',
};

const normalizeReviewList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.reviews)) return payload.reviews;
  return [];
};

const MenuPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState(null);
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [heroImgError, setHeroImgError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [restData, menuData] = await Promise.all([
          api.getRestaurant(id),
          api.getMenuItems({ restaurantId: id, available: true }),
        ]);
        setRestaurant(restData);
        const list = Array.isArray(menuData) ? menuData : menuData.data || [];
        const available = list.filter((i) => !i.isOutOfStock && i.isAvailable !== false);
        setItems(available);
        setFilteredItems(available);
      } catch (err) {
        setError(err.message);
        setRestaurant(null);
        setItems([]);
        setFilteredItems([]);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  useEffect(() => {
    if (id) {
      api
        .getRestaurantReviews(id)
        .then((list) => setReviews(normalizeReviewList(list)))
        .catch(() => setReviews([]));
    }
  }, [id]);

  useEffect(() => {
    if (searchParams.get('review') === '1' && user?.role === 'customer' && !loading) {
      setShowReviewModal(true);
    }
  }, [searchParams, user, loading]);

  const reviewOrderId = searchParams.get('orderId');

  const categories = items.length > 0 ? [...new Set(items.map((i) => i.category).filter(Boolean))] : [];

  useEffect(() => {
    setFilteredItems(selectedCategory === 'all' ? items : items.filter((i) => i.category === selectedCategory));
  }, [selectedCategory, items]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="animate-pulse space-y-6">
          <div className="h-64 bg-gray-200 rounded-2xl" />
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="card p-12">
          <h2 className="text-xl font-display font-semibold text-gray-800 mb-2">Restaurant not found</h2>
          <p className="text-gray-500">{error || 'The restaurant may not exist or the API is unavailable.'}</p>
        </div>
      </div>
    );
  }

  const restImage = restaurant.logo && !heroImgError
    ? `${API_URL}/api/uploads/${restaurant.logo}`
    : restaurant.image || restaurant.imageUrl || PLACEHOLDER_IMAGES[restaurant.cuisineType] || PLACEHOLDER_IMAGES.American;
  const address = restaurant.location?.address
    ? `${restaurant.location.address}${restaurant.location.city ? `, ${restaurant.location.city}` : ''}`
    : '';

  const handleSubmitReview = async () => {
    if (!user) { navigate('/profile'); return; }
    setReviewSubmitting(true);
    try {
      const createdReview = await api.createReview(id, { rating: reviewRating, comment: reviewComment, orderId: reviewOrderId || undefined });
      const normalizedCreated = createdReview?.data || createdReview;
      if (normalizedCreated?._id) {
        setReviews((prev) => [normalizedCreated, ...prev]);
      } else {
        const list = await api.getRestaurantReviews(id);
        setReviews(normalizeReviewList(list));
      }

      const existingCount = reviews.length;
      const updatedAvg = ((Number(restaurant?.rating || 0) * existingCount) + Number(reviewRating || 0)) / (existingCount + 1);
      setRestaurant((prev) => (prev ? { ...prev, rating: Math.round(updatedAvg * 10) / 10 } : prev));

      const restData = await api.getRestaurant(id);
      setRestaurant(restData);
      setShowReviewModal(false);
      setReviewComment('');
    } catch (err) {
      alert(err.message || 'Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 py-3 px-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-gray-600">
            <span className="font-medium text-gray-900">Delivery to</span> {address || 'Add address'}
          </span>
          <span className="text-primary-600 font-semibold">ASAP</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="relative h-48 sm:h-64 mb-8 rounded-xl overflow-hidden shadow-md">
          <img src={restImage} alt={restaurant.name} className="w-full h-full object-cover" onError={() => setHeroImgError(true)} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-white">
          <h1 className="text-2xl md:text-4xl font-display font-bold mb-2 drop-shadow-md">{restaurant.name}</h1>
          <div className="flex items-center gap-3 text-white/90 text-sm flex-wrap">
            {restaurant.rating > 0 && (
              <span className="flex items-center gap-1 bg-primary-500 px-2.5 py-1 rounded-lg text-xs font-medium">
                {restaurant.rating.toFixed(1)} ★
              </span>
            )}
            <span>{restaurant.cuisineType}</span>
            {restaurant.isOpen && <span className="text-sky-300">• Open now</span>}
          </div>
          {address && <p className="text-sm text-white/80 mt-1">{address}</p>}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:flex-1">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Menu</h2>
            <CategoryFilter categories={categories} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />

            {filteredItems.length > 0 ? (
              <div className="grid gap-4 sm:gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                {filteredItems.map((item) => (
                  <MenuItemCard key={item._id} item={item} restaurant={restaurant} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm mt-6">
                <p className="text-gray-500">No menu items available.</p>
              </div>
            )}

            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-display font-bold text-gray-800">Reviews</h3>
                  {reviews.length > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-100">
                      <span className="text-2xl font-bold text-amber-600">{restaurant.rating?.toFixed(1) || '0.0'}</span>
                      <span className="text-amber-600">★</span>
                      <span className="text-sm text-gray-600">({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
                    </div>
                  )}
                </div>
                {user?.role === 'customer' && (
                  <button onClick={() => setShowReviewModal(true)} className="btn-secondary py-2 px-4 text-sm">
                    Write a review
                  </button>
                )}
              </div>
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.slice(0, 10).map((r) => (
                    <div key={r._id} className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-800">{r.customerName}</span>
                        <span className="flex text-amber-500 text-sm">
                          {'★'.repeat(Math.round(r.rating))}{'☆'.repeat(5 - Math.round(r.rating))} ({r.rating})
                        </span>
                      </div>
                      {r.comment && <p className="text-gray-600 text-sm">{r.comment}</p>}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 py-4">No reviews yet. Be the first to review!</p>
              )}
            </div>

            {showReviewModal && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowReviewModal(false)}>
                <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-lg font-display font-bold text-gray-800 mb-4">Write a Review</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            className={`text-2xl transition-colors ${reviewRating >= star ? 'text-amber-500' : 'text-gray-300'}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Comment (optional)</label>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        className="input-field min-h-[100px]"
                        placeholder="Share your experience..."
                        maxLength={500}
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button onClick={handleSubmitReview} disabled={reviewSubmitting} className="btn-primary flex-1">
                        {reviewSubmitting ? 'Submitting...' : 'Submit'}
                      </button>
                      <button onClick={() => setShowReviewModal(false)} className="btn-secondary">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuPage;
