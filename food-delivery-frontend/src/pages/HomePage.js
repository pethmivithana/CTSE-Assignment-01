import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

const HomePage = () => {
  const [restaurantCount, setRestaurantCount] = useState(null);
  const [welcomeMessage, setWelcomeMessage] = useState('');

  useEffect(() => {
    api.getRestaurants()
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.data || data?.restaurants || [];
        setRestaurantCount(list.length);
      })
      .catch(() => setRestaurantCount(0));
  }, []);

  useEffect(() => {
    const msg = sessionStorage.getItem('postRegisterWelcomeMessage');
    const loginMsg = sessionStorage.getItem('postLoginMessage');
    const finalMsg = msg || loginMsg;
    if (!finalMsg) return;
    setWelcomeMessage(finalMsg);
    sessionStorage.removeItem('postRegisterWelcomeMessage');
    sessionStorage.removeItem('postLoginMessage');
    const id = setTimeout(() => setWelcomeMessage(''), 6000);
    return () => clearTimeout(id);
  }, []);

  const benefits = [
    {
      title: 'Order From Anywhere',
      desc: 'Relish your favourite cuisines from any restaurant at the comfort of your home.',
      icon: (
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
    },
    {
      title: 'Quick & Easy',
      desc: 'Connect with your favourite restaurant with just a tap of a button.',
      icon: (
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: 'Live Tracking',
      desc: 'Track your delivery rider in real-time from restaurant to your doorstep.',
      icon: (
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      title: 'Safe & Reliable',
      desc: 'Convenience, variety & safety – we deliver with care.',
      icon: (
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      title: 'Exclusive Deals',
      desc: 'Get discounts, promo codes and special offers on your favourite meals.',
      icon: (
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
        </svg>
      ),
    },
    {
      title: 'Wide Restaurant Choice',
      desc: 'Browse hundreds of restaurants and cuisines in one place.',
      icon: (
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 8h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
  ];

  const stats = [
    { value: restaurantCount != null ? String(restaurantCount) : '—', label: 'Restaurants' },
    { value: '~30min', label: 'Avg. delivery' },
    { value: '24/7', label: 'Support' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {welcomeMessage && (
        <div className="fixed top-20 right-4 z-50 max-w-sm rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 shadow-lg">
          <div className="flex items-start gap-3 p-4">
            <svg className="w-5 h-5 mt-0.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <div className="text-sm leading-relaxed">{welcomeMessage}</div>
            <button
              type="button"
              onClick={() => setWelcomeMessage('')}
              className="text-emerald-700 hover:text-emerald-900"
              aria-label="Dismiss welcome message"
            >
              ×
            </button>
          </div>
        </div>
      )}
      <section
        className="relative text-white overflow-hidden min-h-[70vh]"
        style={{
          backgroundImage: `url(https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.05)_0%,transparent_50%)]" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10">
            <div className="max-w-2xl">
              <p className="text-primary-100 text-sm font-medium uppercase tracking-wider mb-4">Food delivery platform</p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-extrabold leading-[1.15] mb-6">
                Fresh Eats, Delivered to Your Door
              </h2>
              <p className="text-lg text-white/90 mb-6 leading-relaxed">
                Order from top restaurants, cloud kitchens, and local vendors. Fast, reliable, and hassle-free.
              </p>
              <Link
                to="/restaurants"
                className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-white text-primary-600 hover:bg-primary-50 transition-all shadow-lg hover:shadow-xl"
              >
                Browse all restaurants
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
              </Link>
            </div>
            <div className="flex gap-8 lg:gap-12 pb-2">
              {stats.map((s, i) => (
                <div key={i} className="text-center lg:text-right">
                  <span className="font-display font-bold text-2xl lg:text-3xl text-white block">{s.value}</span>
                  <span className="text-primary-100 text-sm">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pt-20 md:pt-28 pb-10 md:pb-14 bg-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-center text-2xl md:text-4xl font-display font-bold text-gray-900 mb-8">
            Satisfy Every Craving With Our Exceptional Food Delivery
          </h2>
          <div className="flex flex-col lg:flex-row items-stretch gap-8 lg:gap-10">
            <div className="lg:w-1/2">
              <img
                src="https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&w=600&h=400&q=80"
                alt="Food delivery - order from your favourite restaurants"
                className="w-full max-h-[360px] object-cover rounded-2xl"
                loading="lazy"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://placehold.co/800x500/f3f4f6/9ca3af?text=Food+Delivery';
                }}
              />
            </div>
            <div className="lg:w-1/2 flex items-center">
              <div className="w-full p-8 md:p-10 rounded-2xl bg-white shadow-sm border border-gray-100">
                <p className="text-gray-700 leading-relaxed mb-4">
                  Feedo is your trusted food delivery solution, bringing the best restaurants and cuisines right to your doorstep. Whether you crave local favourites or want to try something new, we make it easy to order, track, and enjoy.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  With hundreds of merchant partners and a growing network of restaurants, cloud kitchens, and local vendors, we're committed to delivering quality food fast and hassle-free. Satisfy every craving with Feedo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-center text-2xl md:text-3xl font-display font-bold text-gray-900 mb-8">Benefits</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
            {benefits.map((b, i) => (
              <div
                key={i}
                className="flex flex-col items-center text-center p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-5">
                  {b.icon}
                </div>
                <h3 className="font-display font-bold text-gray-900 mb-2">{b.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14 bg-gray-50/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row items-stretch overflow-hidden rounded-3xl bg-white border border-gray-100 shadow-sm">
            <div className="lg:w-2/5 relative min-h-[280px] lg:min-h-[400px]">
              <img
                src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800"
                alt="Restaurant partner"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
            <div className="lg:w-3/5 flex flex-col justify-center p-8 md:p-12">
              <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900 mb-3">
                Got A Restaurant? Grow With Us.
              </h2>
              <p className="text-base md:text-lg font-semibold text-gray-700 mb-4">
                We're hungry for the BEST! A world of customers now within your reach!
              </p>
              <p className="text-gray-600 leading-relaxed mb-8 max-w-xl">
                Feedo is your one-stop solution for reaching hungry customers. Join us as a Merchant Partner and grow your food business with our delivery platform.
              </p>
              <Link
                to="/profile"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold bg-red-500 text-white hover:bg-red-600 transition-all shadow-md hover:shadow-lg w-fit"
              >
                Partner With Us
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
