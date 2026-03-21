import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const SIZES = [
  { key: 'small', label: 'Small', shortLabel: 'S', serves: 1 },
  { key: 'medium', label: 'Medium', shortLabel: 'M', serves: 2 },
  { key: 'large', label: 'Large', shortLabel: 'L', serves: 4 },
];

const MenuItemCard = ({ item, restaurant }) => {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [selectedSize, setSelectedSize] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriting, setFavoriting] = useState(false);

  const menuItemId = item._id || item.id;
  const displayName = item.foodName || item.name;

  useEffect(() => {
    if (!user) return;
    api.getFavoriteFoods()
      .then((list) => setIsFavorite((list || []).some((f) => String(f.menuItemId) === String(menuItemId))))
      .catch(() => {});
  }, [user, menuItemId]);

  const handleToggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    setFavoriting(true);
    try {
      if (isFavorite) {
        await api.removeFavoriteFood(menuItemId);
        setIsFavorite(false);
      } else {
        await api.addFavoriteFood(menuItemId, displayName || 'Food item');
        setIsFavorite(true);
      }
    } catch (err) {
      // ignore
    } finally {
      setFavoriting(false);
    }
  };
  const prices = item.prices || {};
  const hasSizes = prices.small != null || prices.medium != null || prices.large != null;
  const availableSizes = SIZES.filter(s => prices[s.key] != null);
  const singlePrice = !hasSizes ? (item.price ?? 0) : null;
  const minPrice = hasSizes ? Math.min(...availableSizes.map(s => prices[s.key]).filter(Boolean)) : singlePrice;
  const price = hasSizes && selectedSize ? (prices[selectedSize] ?? 0) : (hasSizes ? minPrice : singlePrice);
  let image = item.imageUrl || item.image;
  if (image && !image.startsWith('http')) image = `${API_URL}/api/uploads/${image}`;
  if (!image) image = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';
  const canAdd = !item.isOutOfStock && (!hasSizes || selectedSize);

  const handleAdd = (e) => {
    e.preventDefault();
    const size = hasSizes ? (selectedSize || Object.keys(prices).find(k => prices[k] != null)) : null;
    const sizePrice = hasSizes && size ? (prices[size] ?? 0) : singlePrice;
    const cartItem = {
      _id: item._id,
      id: item._id,
      foodName: displayName,
      name: displayName,
      price: sizePrice,
      imageUrl: image,
      image,
      size: size || undefined,
      servings: size ? SIZES.find(s => s.key === size)?.serves : undefined,
    };
    addToCart(cartItem, restaurant, size);
  };

  return (
    <div className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 border border-gray-100">
      {/* Image - large, rounded top */}
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        <img src={image} alt={displayName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <div className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm">
            {item.isVeg ? (
              <span className="w-3.5 h-3.5 rounded-full bg-green-500" title="Vegetarian" />
            ) : (
              <span className="w-3.5 h-3.5 rounded-full bg-orange-500" title="Non-vegetarian" />
            )}
          </div>
          {user && (
            <button
              onClick={handleToggleFavorite}
              disabled={favoriting}
              className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors disabled:opacity-70"
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <svg className={`w-4 h-4 ${isFavorite ? 'text-amber-500 fill-amber-500' : 'text-gray-400'}`} fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          )}
        </div>
        {!item.isOutOfStock && !hasSizes && (
          <button onClick={handleAdd} className="absolute bottom-3 right-3 bg-white/95 text-primary-600 text-sm font-semibold px-4 py-2 rounded-xl shadow-md hover:bg-primary-50 transition-colors">
            Add
          </button>
        )}
      </div>

      {/* Content - generous spacing */}
      <div className="p-4 sm:p-5">
        <div className="flex justify-between items-start gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 text-base leading-tight truncate">{item.foodName || item.name}</h3>
            <p className="text-gray-500 text-sm mt-0.5">{item.category}</p>
            {item.description && <p className="text-gray-400 text-xs mt-1 line-clamp-2">{item.description}</p>}
          </div>
          <span className="font-bold text-primary-600 text-lg whitespace-nowrap">
            {minPrice != null ? (hasSizes && !selectedSize ? `LKR ${minPrice.toLocaleString()}+` : `LKR ${Number(price).toLocaleString()}`) : '—'}
          </span>
        </div>

        {/* Segmented control for sizes */}
        {hasSizes && (
          <div className="mb-4">
            <div className="inline-flex rounded-xl bg-gray-100 p-1 w-full gap-0.5" role="group">
              {availableSizes.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSelectedSize(s.key)}
                  title={`${s.label} (${s.serves} serving${s.serves > 1 ? 's' : ''})`}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all duration-150 min-w-0 ${
                    selectedSize === s.key
                      ? 'bg-white text-primary-600 shadow-sm font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {s.shortLabel} · LKR {prices[s.key].toLocaleString()}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleAdd}
          disabled={!canAdd}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
            canAdd
              ? 'bg-primary-500 text-white hover:bg-primary-600 active:scale-[0.98]'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {item.isOutOfStock ? 'Out of stock' : canAdd ? 'Add to Cart' : 'Select size'}
        </button>
      </div>
    </div>
  );
};

export default MenuItemCard;
