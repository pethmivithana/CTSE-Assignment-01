import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const statusConfig = {
  CREATED: { label: 'Placed', class: 'bg-amber-100 text-amber-800' },
  PENDING: { label: 'Placed', class: 'bg-amber-100 text-amber-800' },
  CONFIRMED: { label: 'Confirmed', class: 'bg-blue-100 text-blue-800' },
  ACCEPTED: { label: 'Confirmed', class: 'bg-blue-100 text-blue-800' },
  PREPARING: { label: 'Preparing', class: 'bg-indigo-100 text-indigo-700' },
  READY: { label: 'Ready', class: 'bg-cyan-100 text-cyan-700' },
  PICKED_UP: { label: 'On the way', class: 'bg-violet-100 text-violet-800' },
  OUT_FOR_DELIVERY: { label: 'On the way', class: 'bg-violet-100 text-violet-800' },
  DELIVERED: { label: 'Delivered', class: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'Cancelled', class: 'bg-gray-100 text-gray-700' },
};

const canCustomerCancel = (status) => status === 'CREATED' || status === 'PENDING';

const OrdersPage = () => {
  const { user } = useAuth();
  const { loadReorderCart } = useCart();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionId, setActionId] = useState(null);

  const refresh = async () => {
    const data = await api.getMyOrders();
    setOrders(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    if (!user) {
      navigate('/profile');
      return;
    }
    // /api/orders/me is customer-only — drivers get 403 here
    if (user.role === 'deliveryPerson') {
      navigate('/delivery/dashboard');
      return;
    }
    const fetchOrders = async () => {
      try {
        setLoading(true);
        await refresh();
      } catch (err) {
        setError(err.message);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user, navigate]);

  useEffect(() => {
    if (!user || user.role !== 'customer') return undefined;
    const id = setInterval(() => {
      refresh().catch(() => {});
    }, 8000);
    return () => clearInterval(id);
  }, [user]);

  const getStatusBadge = (status) => {
    const config = statusConfig[status] || { label: status, class: 'bg-gray-100 text-gray-700' };
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.class}`}>{config.label}</span>;
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const formatAddress = (addr) => {
    if (!addr) return '';
    if (typeof addr === 'string') return addr;
    return [addr.street, addr.city, addr.postalCode].filter(Boolean).join(', ');
  };

  const getItemImageUrl = (item) => {
    const img = item?.imageUrl || item?.image;
    if (!img) return null;
    if (img.startsWith('http')) return img;
    return `${API_URL}/api/uploads/${img}`;
  };

  const getOrderItemImages = (items) => {
    if (!items?.length) return [];
    const urls = items.map((item) => getItemImageUrl(item)).filter(Boolean);
    return urls.length > 0 ? urls : null;
  };

  const handleCancel = async (order) => {
    if (!window.confirm('Cancel this order?')) return;
    setActionId(order._id);
    try {
      await api.cancelOrder(order._id);
      await refresh();
    } catch (e) {
      alert(e.message || 'Could not cancel');
    } finally {
      setActionId(null);
    }
  };

  const handleReorder = async (order) => {
    setActionId(order._id);
    try {
      const data = await api.reorder(order._id);
      const restaurant = await api.getRestaurant(data.restaurantId);
      loadReorderCart(restaurant, data.items || []);
      navigate(`/restaurants/${data.restaurantId}`);
    } catch (e) {
      alert(e.message || 'Could not reorder');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-800 mb-10">Your Orders</h1>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card overflow-hidden animate-pulse">
              <div className="flex">
                <div className="w-40 h-36 bg-gray-200" />
                <div className="p-6 flex-1 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-1/3" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="card p-12 text-center">
          <p className="text-red-600 mb-4">{error}</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="card p-12 text-center shadow-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gray-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h2 className="text-xl font-display font-semibold text-gray-800 mb-2">No orders yet</h2>
          <p className="text-gray-500 mb-8">When you place orders, they'll appear here</p>
          <button onClick={() => navigate('/restaurants')} className="btn-primary">
            Browse Restaurants
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => (
            <div key={order._id} className="card overflow-hidden shadow-lg">
              <div className="flex flex-col sm:flex-row">
                <div className="sm:w-40 min-h-[144px] sm:min-h-[180px] bg-gray-100 flex-shrink-0 flex items-center justify-center p-2 overflow-hidden relative">
                  {(() => {
                    const imgUrls = getOrderItemImages(order.items);
                    if (imgUrls && imgUrls.length > 0) {
                      const displayUrls = imgUrls.slice(0, 4);
                      return (
                        <>
                          <div className={`grid w-full h-full gap-0.5 ${
                            displayUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                          }`}>
                            {displayUrls.map((url, i) => (
                              <div key={i} className="aspect-square rounded-md overflow-hidden bg-white">
                                <img src={url} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200'; }} />
                              </div>
                            ))}
                          </div>
                          {imgUrls.length > 4 && (
                            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded-md">
                              +{imgUrls.length - 4} more
                            </div>
                          )}
                        </>
                      );
                    }
                    return (
                      <svg className="w-16 h-16 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    );
                  })()}
                </div>
                <div className="p-6 flex-1">
                  <div className="flex flex-wrap justify-between items-start gap-2 mb-4">
                    <div>
                      <h3 className="font-display font-semibold text-gray-800">Order #{order._id?.slice(-6).toUpperCase()}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{formatDate(order.createdAt || order.date)}</p>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Items</p>
                    <div className="flex flex-wrap gap-2">
                      {order.items?.map((item, i) => {
                        const sizeLabel = item.size ? { small: 'Small', medium: 'Medium', large: 'Large' }[item.size] || item.size : '';
                        const label = sizeLabel ? `${item.name} · ${sizeLabel}` : item.name;
                        return (
                          <div
                            key={i}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-sm text-gray-700"
                          >
                            <span className="font-semibold text-primary-600">{item.quantity}×</span>
                            <span>{label}</span>
                            {item.price != null && (
                              <span className="text-xs text-gray-500 ml-1">LKR {((item.price || 0) * (item.quantity || 1)).toFixed(0)}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {(order.subtotal != null || order.taxAmount != null || order.deliveryFee != null) && (
                    <div className="text-xs text-gray-500 space-y-0.5 mb-3 border-t border-gray-100 pt-3">
                      {order.subtotal != null && <p>Subtotal: LKR {Number(order.subtotal).toFixed(2)}</p>}
                      {order.taxAmount != null && <p>Tax: LKR {Number(order.taxAmount).toFixed(2)}</p>}
                      {order.deliveryFee != null && <p>Delivery: LKR {Number(order.deliveryFee).toFixed(2)}</p>}
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <p className="text-sm text-gray-500">{formatAddress(order.deliveryAddress)}</p>
                    <p className="font-semibold text-gray-800">LKR {(order.totalAmount || order.total || 0).toFixed(2)}</p>
                  </div>
                  {order.refundRequested && (
                    <p className="text-xs text-amber-700 mt-2">Refund requested — our team will process it shortly.</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => navigate(`/orders/track/${order._id}`)}
                      className="btn-secondary py-2 px-4 text-sm"
                    >
                      Track
                    </button>
                    {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
                      <button
                        type="button"
                        onClick={() => handleReorder(order)}
                        disabled={actionId === order._id}
                        className="btn-primary py-2 px-4 text-sm disabled:opacity-60"
                      >
                        {actionId === order._id ? '…' : 'Reorder'}
                      </button>
                    )}
                    {canCustomerCancel(order.status) && (
                      <button
                        type="button"
                        onClick={() => handleCancel(order)}
                        disabled={actionId === order._id}
                        className="py-2 px-4 text-sm rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  {order.status === 'DELIVERED' && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      <button
                        onClick={() => navigate(`/restaurants/${order.restaurantId}?review=1&orderId=${order._id}`)}
                        className="btn-secondary py-2 px-4 text-sm"
                      >
                        Rate & Review
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
