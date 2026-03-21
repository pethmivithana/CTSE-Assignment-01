import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';

const SIZE_LABELS = { small: 'Small (1 serving)', medium: 'Medium (2 servings)', large: 'Large (4 servings)' };

const formatItemLabel = (item) => {
  const base = item.name || item.foodName || '';
  return item.size ? `${base} · ${SIZE_LABELS[item.size] || item.size}` : base;
};

const CartItem = ({ item }) => {
  const { currentTheme } = useTheme();
  const { addToCart, removeFromCart, restaurant } = useCart();

  const name = item.name || item.foodName;
  const itemLabel = formatItemLabel(item);
  const price = (item.price ?? 0) * (item.quantity ?? 1);
  const image = item.image || item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200';
  const cartKey = item.cartKey || `${item.id || item._id}-${item.size || 'default'}-${item.variation || 'default'}`;

  return (
    <div className="flex gap-4 sm:gap-6 p-5 sm:p-6 hover:bg-gray-50/50 transition-colors">
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
        <img src={image} alt={name} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-display font-semibold text-gray-900 mb-0.5">{itemLabel || name}</h3>
        <p className="text-primary-600 font-medium">LKR {(item.price ?? 0).toFixed(2)} each</p>
        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center rounded-lg border border-gray-200 bg-white">
            <button
              onClick={() => removeFromCart(cartKey)}
              className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-l-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
              </svg>
            </button>
            <span className="w-10 text-center font-medium text-gray-800 text-sm">{item.quantity}</span>
            <button
              onClick={() => addToCart(item, restaurant, item.size)}
              className={`w-9 h-9 flex items-center justify-center text-white rounded-r-lg ${currentTheme.button} hover:opacity-90 transition-opacity`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
          <span className="font-display font-bold text-gray-900">LKR {price.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default CartItem;
