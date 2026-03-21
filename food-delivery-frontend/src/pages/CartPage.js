import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import CartItem from '../components/CartItem';
import OrderSummary from '../components/OrderSummary';

const CartPage = () => {
  const { cart, restaurant, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (!user) navigate('/profile');
    else navigate('/checkout');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <nav className="text-sm text-gray-500 mb-1">
                <Link to="/" className="hover:text-primary-600">Home</Link>
                <span className="mx-2">/</span>
                <span className="text-gray-800 font-medium">Cart</span>
              </nav>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-900">Your Cart</h1>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-sm text-red-600 hover:text-red-700 font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
              >
                Clear cart
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        {cart.length === 0 ? (
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="h-48 md:h-56 relative overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800"
                  alt="Empty cart"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />
              </div>
              <div className="p-8 md:p-10 text-center">
                <h2 className="text-xl font-display font-bold text-gray-900 mb-2">Your cart is empty</h2>
                <p className="text-gray-600 mb-8">Add items from your favorite restaurants to get started.</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button onClick={() => navigate('/')} className="btn-primary">
                    Browse Restaurants
                  </button>
                  <button onClick={() => navigate('/restaurants')} className="btn-secondary">
                    View All
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            <div className="lg:flex-1">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {restaurant && (
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                    <p className="text-sm text-gray-500">Ordering from</p>
                    <h2 className="font-display font-bold text-gray-900">{restaurant.name}</h2>
                  </div>
                )}
                <div className="divide-y divide-gray-100">
                  {cart.map((item) => (
                    <CartItem key={item.id || item._id} item={item} />
                  ))}
                </div>
              </div>
            </div>
            <div className="lg:w-[400px] flex-shrink-0">
              <OrderSummary showCheckoutButton onCheckout={handleCheckout} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
