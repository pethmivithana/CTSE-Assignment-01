import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { resolveProfilePictureUrl } from '../utils/resolveMediaUrl';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const Navbar = () => {
  const { cart } = useCart();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [restaurant, setRestaurant] = useState(null);
  const [avatarError, setAvatarError] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0);
  const showRestaurantLogo = restaurant?.logo && !avatarError;
  const avatarUrl = showRestaurantLogo ? `${API_URL}/api/uploads/${restaurant.logo}` : null;
  const isCustomer = user?.role === 'customer';
  const dashboardPath =
    user?.role === 'restaurantManager'
      ? '/restaurant/dashboard'
      : user?.role === 'deliveryPerson'
      ? '/delivery/dashboard'
      : user?.role === 'admin'
      ? '/admin'
      : '/profile';

  useEffect(() => {
    if (user?.role === 'restaurantManager') {
      api.getMyRestaurant().then((r) => { setRestaurant(r); setAvatarError(false); }).catch(() => setRestaurant(null));
    } else {
      setRestaurant(null);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadNotifications(0);
      return undefined;
    }
    let cancelled = false;
    const load = () => {
      api.getNotifications(1, 1).then((res) => {
        if (!cancelled) setUnreadNotifications(res.unreadCount ?? 0);
      }).catch(() => {
        if (!cancelled) setUnreadNotifications(0);
      });
    };
    load();
    const id = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user]);

  return (
    <nav className="bg-white backdrop-blur-xl border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white border border-sky-100 flex items-center justify-center shadow-sm">
              <svg className="w-7 h-7 text-red-500" viewBox="0 0 64 64" fill="currentColor">
                <path d="M48 20h-6l-2-6c-.6-1.8-2.2-3-4-3H14c-1.8 0-3.4 1.2-4 3l-2 6H2c-2.2 0-4 1.8-4 4v20c0 2.2 1.8 4 4 4h2.5l1.5 6c.3 1.2 1.3 2 2.5 2h6c1.2 0 2.2-.8 2.5-2l1.5-6h18l1.5 6c.3 1.2 1.3 2 2.5 2h6c1.2 0 2.2-.8 2.5-2l1.5-6H62c2.2 0 4-1.8 4-4V24c0-2.2-1.8-4-4-4zM12 14c0-.6.4-1 1-1h22c.6 0 1 .4 1 1v2H12v-2zm-4 26l-1.5-6h7l1.5 6H8zm40 0h-5.5l1.5-6h7L48 40z"/>
              </svg>
            </div>
            <span className="text-2xl font-display font-bold text-primary-600">Feedo</span>
            <span className="text-xs text-gray-500 hidden sm:inline">Food Delivery</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Home
            </Link>
            <Link
              to="/restaurants"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
              </svg>
              Restaurants
            </Link>
            {user && isCustomer && (
              <Link
                to="/orders"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-colors font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
                </svg>
                Orders
              </Link>
            )}
            {user && !isCustomer && (
              <Link
                to={dashboardPath}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-colors font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6" />
                </svg>
                Dashboard
              </Link>
            )}

            {user && (
              <Link to="/notifications" className="relative ml-2 p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Notifications">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadNotifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center text-xs font-semibold text-white bg-amber-500 rounded-full">
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                )}
              </Link>
            )}
            {user && (
              <Link to="/cart" className="relative ml-2 p-2 rounded-lg hover:bg-gray-100 transition-colors" title="View cart">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {cartItemsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center text-xs font-semibold text-white bg-primary-500 rounded-full">
                    {cartItemsCount}
                  </span>
                )}
              </Link>
            )}

            {user ? (
              <div className="relative ml-2">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-primary-100 text-primary-600 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={restaurant?.name} className="w-full h-full object-cover" onError={() => setAvatarError(true)} />
                    ) : user.profilePicture ? (
                      <img src={resolveProfilePictureUrl(user.profilePicture)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{user.fullName?.charAt(0) || user.name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                  <span className="font-medium text-gray-700 hidden lg:block">{restaurant?.name || user.fullName || user.name}</span>
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isMenuOpen && (
                  <div className="absolute right-0 mt-1 w-48 bg-white/95 backdrop-blur-md rounded-xl shadow-elevated-lg py-2 border border-gray-100 z-20">
                    <Link to="/profile" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setIsMenuOpen(false)}>
                      Profile
                    </Link>
                    {isCustomer ? (
                      <Link to="/orders" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setIsMenuOpen(false)}>
                        Orders
                      </Link>
                    ) : (
                      <Link to={dashboardPath} className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setIsMenuOpen(false)}>
                        Dashboard
                      </Link>
                    )}
                    <Link to="/notifications" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setIsMenuOpen(false)}>
                      Notifications
                      {unreadNotifications > 0 && (
                        <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800">{unreadNotifications}</span>
                      )}
                    </Link>
                    {user.role === 'restaurantManager' && (
                      <Link to="/restaurant/dashboard" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setIsMenuOpen(false)}>
                        Restaurant
                      </Link>
                    )}
                    {user.role === 'admin' && (
                      <Link to="/admin" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setIsMenuOpen(false)}>
                        Admin
                      </Link>
                    )}
                    <hr className="my-2 border-gray-100" />
                    <button onClick={() => { logout(); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/profile" className="ml-2 btn-primary py-2.5 text-sm">
                Sign In
              </Link>
            )}
          </div>

          <div className="md:hidden flex items-center gap-2">
            {user && (
              <Link to="/notifications" className="relative p-2" title="Notifications">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadNotifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white bg-amber-500 rounded-full">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </Link>
            )}
            {user && (
              <Link to="/cart" className="relative p-2">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {cartItemsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center text-xs font-semibold text-white bg-primary-500 rounded-full">
                    {cartItemsCount}
                  </span>
                )}
              </Link>
            )}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <div className="px-4 py-4 space-y-1">
            <Link to="/" className="flex items-center gap-3 py-3 px-4 rounded-lg text-gray-700 hover:bg-gray-50 font-medium" onClick={() => setIsMenuOpen(false)}>
              <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Home
            </Link>
            <Link to="/restaurants" className="flex items-center gap-3 py-3 px-4 rounded-lg text-gray-700 hover:bg-gray-50 font-medium" onClick={() => setIsMenuOpen(false)}>
              <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
              </svg>
              Restaurants
            </Link>
            {user && isCustomer && (
              <Link to="/orders" className="block py-3 px-4 rounded-lg text-gray-700 hover:bg-gray-50 font-medium" onClick={() => setIsMenuOpen(false)}>
                Orders
              </Link>
            )}
            {user && !isCustomer && (
              <Link to={dashboardPath} className="block py-3 px-4 rounded-lg text-gray-700 hover:bg-gray-50 font-medium" onClick={() => setIsMenuOpen(false)}>
                Dashboard
              </Link>
            )}
            <Link to="/profile" className="block py-3 px-4 rounded-lg text-gray-700 hover:bg-gray-50 font-medium" onClick={() => setIsMenuOpen(false)}>
              {user ? 'Profile' : 'Sign In'}
            </Link>
            {user && (
              <>
                <Link to="/notifications" className="block py-3 px-4 rounded-lg text-gray-700 hover:bg-gray-50 font-medium" onClick={() => setIsMenuOpen(false)}>
                  Notifications{unreadNotifications > 0 ? ` (${unreadNotifications})` : ''}
                </Link>
                {user.role === 'admin' && <Link to="/admin" className="block py-3 px-4 rounded-lg text-gray-700 hover:bg-gray-50 font-medium" onClick={() => setIsMenuOpen(false)}>Admin</Link>}
                {user.role === 'restaurantManager' && <Link to="/restaurant/dashboard" className="block py-3 px-4 rounded-lg text-gray-700 hover:bg-gray-50 font-medium" onClick={() => setIsMenuOpen(false)}>Restaurant</Link>}
                <button onClick={() => { logout(); setIsMenuOpen(false); }} className="block w-full text-left py-3 px-4 rounded-lg text-red-600 hover:bg-red-50 font-medium">Logout</button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
