const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const getAuthHeaders = () => {
  const token = localStorage.getItem('foodAppToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const api = {
  // Restaurants
  getRestaurants: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/api/restaurants${qs ? `?${qs}` : ''}`);
    if (!res.ok) throw new Error('Failed to fetch restaurants');
    return res.json();
  },
  getRestaurant: async (id) => {
    const res = await fetch(`${API_URL}/api/restaurants/${id}`);
    if (!res.ok) throw new Error('Restaurant not found');
    return res.json();
  },
  getRestaurantReviews: async (restaurantId) => {
    const res = await fetch(`${API_URL}/api/restaurants/${restaurantId}/reviews`);
    if (!res.ok) throw new Error('Failed to fetch reviews');
    return res.json();
  },
  getAdminRestaurantReviews: async () => {
    const res = await fetch(`${API_URL}/api/restaurants/admin/reviews`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to fetch restaurant feedback');
    return data;
  },
  createReview: async (restaurantId, { rating, comment, orderId }) => {
    const res = await fetch(`${API_URL}/api/restaurants/${restaurantId}/reviews`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ rating, comment, orderId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to submit review');
    return data;
  },

  // Menu items
  getMenuItems: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/api/menu-items${qs ? `?${qs}` : ''}`);
    if (!res.ok) throw new Error('Failed to fetch menu items');
    return res.json();
  },

  // Payments
  createPaymentIntent: async (paymentData, opts = {}) => {
    const res = await fetch(`${API_URL}/api/payments/create-intent`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        ...(opts.idempotencyKey && { 'Idempotency-Key': String(opts.idempotencyKey).slice(0, 255) }),
      },
      // Also send idempotency in body so payment-service works if a proxy drops the header
      body: JSON.stringify({
        ...paymentData,
        ...(opts.idempotencyKey && { idempotencyKey: String(opts.idempotencyKey).slice(0, 255) }),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (data.useFallback) return data;
      throw new Error(data.message || data.error || 'Failed to create payment');
    }
    return data;
  },
  createPayment: async (paymentData) => {
    const res = await fetch(`${API_URL}/api/payments/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(paymentData),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Payment failed');
    return data;
  },
  getPayment: async (paymentId) => {
    const res = await fetch(`${API_URL}/api/payments/${paymentId}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Payment not found');
    return res.json();
  },
  getWalletBalance: async (customerId) => {
    const qs = new URLSearchParams({ customerId }).toString();
    const res = await fetch(`${API_URL}/api/payments/wallet/balance?${qs}`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Wallet unavailable');
    return data;
  },
  walletTopUp: async (customerId, amount) => {
    const res = await fetch(`${API_URL}/api/payments/wallet/topup`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ customerId, amount }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Top-up failed');
    return data;
  },
  walletPay: async (payload) => {
    const res = await fetch(`${API_URL}/api/payments/wallet/pay`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Wallet payment failed');
    return data;
  },
  createPaypalOrder: async (payload) => {
    const res = await fetch(`${API_URL}/api/payments/paypal/create-order`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'PayPal order failed');
    return data;
  },
  capturePaypal: async (paypalOrderId, orderId) => {
    const res = await fetch(`${API_URL}/api/payments/paypal/capture`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ paypalOrderId, orderId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'PayPal capture failed');
    return data;
  },
  recordCodPayment: async (payload) => {
    const res = await fetch(`${API_URL}/api/payments/cod`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to record COD');
    return data;
  },
  getPaymentHistory: async (customerId) => {
    const qs = new URLSearchParams({ customerId }).toString();
    const res = await fetch(`${API_URL}/api/payments/history/me?${qs}`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to load payments');
    return data.data || data;
  },
  getPaymentReceipt: async (paymentId, format) => {
    const q = format === 'html' ? '?format=html' : '';
    const res = await fetch(`${API_URL}/api/payments/receipt/${paymentId}${q}`, { headers: getAuthHeaders() });
    if (format === 'html') return res.text();
    return res.json();
  },

  // Orders
  validateCoupon: async (code, orderTotal) => {
    const res = await fetch(`${API_URL}/api/orders/validate-coupon`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ code, orderTotal }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to validate coupon');
    return data;
  },
  createOrder: async (orderData) => {
    const res = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(orderData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to place order');
    return data;
  },
  getOrderById: async (orderId) => {
    const res = await fetch(`${API_URL}/api/orders/${orderId}`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to load order');
    return data.data || data;
  },
  cancelOrder: async (orderId, reason) => {
    const res = await fetch(`${API_URL}/api/orders/${orderId}/cancel`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(reason ? { reason } : {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to cancel order');
    return data;
  },
  reorder: async (orderId) => {
    const res = await fetch(`${API_URL}/api/orders/${orderId}/reorder`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Could not load reorder');
    return data.data || data;
  },
  getMyOrders: async () => {
    const res = await fetch(`${API_URL}/api/orders/me`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch orders');
    const data = await res.json();
    return data.data || data;
  },
  trackOrder: async (orderId) => {
    const res = await fetch(`${API_URL}/api/orders/track/${orderId}`);
    if (!res.ok) throw new Error('Order not found');
    return res.json();
  },
  getRestaurantOrders: async () => {
    const res = await fetch(`${API_URL}/api/orders/restaurant`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch orders');
    const data = await res.json();
    return data.data || data;
  },
  updateOrderStatus: async (orderId, status, estimatedPreparationTime, rejectionReason) => {
    const body = { status };
    if (estimatedPreparationTime != null) body.estimatedPreparationTime = estimatedPreparationTime;
    if (rejectionReason) body.rejectionReason = rejectionReason;
    const res = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update order');
    return data;
  },
  getRestaurantAnalytics: async () => {
    const res = await fetch(`${API_URL}/api/orders/restaurant/analytics`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  // Restaurant manager - my restaurant
  createMyRestaurant: async () => {
    const res = await fetch(`${API_URL}/api/restaurants/my-restaurant/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.error || 'Failed to create restaurant');
    return data;
  },
  getMyRestaurant: async () => {
    let res;
    try {
      res = await fetch(`${API_URL}/api/restaurants/my-restaurant`, { headers: getAuthHeaders() });
    } catch (err) {
      throw new Error('Unable to connect. Please check that the app is running and try again.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const serverMsg = data.message || data.error;
      const friendlyMsg =
        res.status === 401
          ? 'Your session may have expired. Please sign in again.'
          : res.status === 403
          ? "You don't have access to a restaurant. Contact support if you've been approved."
          : res.status === 404
          ? "Restaurant not found. If you were recently approved, wait a moment and try again."
          : res.status >= 500
          ? "We're having trouble connecting. Please check that all services are running and try again."
          : serverMsg || "We couldn't load your restaurant. Please try again or contact support.";
      throw new Error(friendlyMsg);
    }
    return data;
  },
  updateMyRestaurant: async (data) => {
    const res = await fetch(`${API_URL}/api/restaurants/my-restaurant`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update restaurant');
    return res.json();
  },
  updateMyRestaurantAvailability: async (isOpen) => {
    const res = await fetch(`${API_URL}/api/restaurants/my-restaurant/availability`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isOpen }),
    });
    if (!res.ok) throw new Error('Failed to update availability');
    return res.json();
  },
  uploadRestaurantLogo: async (file) => {
    const formData = new FormData();
    formData.append('logo', file);
    const res = await fetch(`${API_URL}/api/restaurants/my-restaurant/logo`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${localStorage.getItem('foodAppToken')}` },
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload logo');
    return res.json();
  },
  getMyRestaurantAnalytics: async () => {
    const res = await fetch(`${API_URL}/api/restaurants/my-restaurant/analytics`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },
  getCategories: async (restaurantId) => {
    const res = await fetch(`${API_URL}/api/categories?restaurantId=${restaurantId}`);
    if (!res.ok) throw new Error('Failed to fetch categories');
    return res.json();
  },
  createCategory: async (data) => {
    const res = await fetch(`${API_URL}/api/categories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create category');
    return res.json();
  },
  updateCategory: async (id, data) => {
    const res = await fetch(`${API_URL}/api/categories/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update category');
    return res.json();
  },
  deleteCategory: async (id) => {
    const res = await fetch(`${API_URL}/api/categories/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete category');
    return res.json();
  },
  createMenuItem: async (data, imageFile) => {
    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => formData.append(k, v !== undefined && v !== null ? v : ''));
    if (imageFile) formData.append('image', imageFile);
    const res = await fetch(`${API_URL}/api/menu-items`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('foodAppToken')}` },
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to create item');
    return res.json();
  },
  updateMenuItem: async (id, data, imageFile) => {
    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => formData.append(k, v !== undefined && v !== null ? v : ''));
    if (imageFile) formData.append('image', imageFile);
    const res = await fetch(`${API_URL}/api/menu-items/${id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${localStorage.getItem('foodAppToken')}` },
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to update item');
    return res.json();
  },
  deleteMenuItem: async (id) => {
    const res = await fetch(`${API_URL}/api/menu-items/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete item');
    return res.json();
  },
  updateMenuItemStock: async (id, isOutOfStock, stockQuantity) => {
    const body = { isOutOfStock };
    if (stockQuantity !== undefined) body.stockQuantity = stockQuantity;
    const res = await fetch(`${API_URL}/api/menu-items/${id}/stock`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Failed to update availability');
    return res.json();
  },

  // Delivery fee calculation (before checkout)
  calculateDeliveryFee: async (pickupLat, pickupLon, dropoffLat, dropoffLon, orderAmount = 0) => {
    const res = await fetch(`${API_URL}/api/delivery/deliveries/calculate-fee`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pickupLat,
        pickupLon,
        dropoffLat,
        dropoffLon,
        orderAmount,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to calculate delivery fee');
    return data;
  },

  // Delivery / Driver
  registerDriverProfile: async () => {
    const res = await fetch(`${API_URL}/api/users/me/register-driver`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to sync driver profile');
    return data;
  },
  getDriverProfile: async () => {
    const res = await fetch(`${API_URL}/api/delivery/drivers/me`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to fetch driver profile');
    return data;
  },
  getAvailableDeliveries: async () => {
    const res = await fetch(`${API_URL}/api/delivery/deliveries/available`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to fetch deliveries');
    return data.deliveries || data;
  },
  updateDriverAvailability: async (driverId, isAvailable) => {
    const res = await fetch(`${API_URL}/api/delivery/drivers/${driverId}/availability`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isAvailable }),
    });
    if (!res.ok) throw new Error('Failed to update availability');
    return res.json();
  },
  acceptDelivery: async (driverId, deliveryId) => {
    const res = await fetch(`${API_URL}/api/delivery/drivers/${driverId}/accept`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ deliveryId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || 'Failed to accept delivery');
    return data;
  },
  /** @param statusOrPayload string status or { status, note?, deliveryOtp?, photoBase64? } */
  updateDeliveryStatus: async (driverId, deliveryId, statusOrPayload) => {
    const body =
      typeof statusOrPayload === 'string'
        ? { status: statusOrPayload }
        : statusOrPayload;
    const res = await fetch(`${API_URL}/api/delivery/drivers/${driverId}/deliveries/${deliveryId}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to update status');
    return data;
  },
  updateDriverLocation: async (driverId, latitude, longitude) => {
    const res = await fetch(`${API_URL}/api/delivery/drivers/${driverId}/location`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ latitude, longitude }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to update location');
    return data;
  },
  /** Public delivery map data (no OTP) */
  trackDelivery: async (orderId) => {
    const res = await fetch(`${API_URL}/api/delivery/track/${orderId}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Delivery tracking unavailable');
    return data;
  },
  /** Logged-in customer: includes OTP when rider is on the way */
  trackDeliveryForCustomer: async (orderId) => {
    const res = await fetch(`${API_URL}/api/delivery/track/${orderId}/customer`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not load live tracking');
    return data;
  },
  reportDeliveryException: async (orderId, type, details) => {
    const res = await fetch(`${API_URL}/api/delivery/deliveries/order/${orderId}/exception`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ type, details }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to report');
    return data;
  },
  getDriverDeliveries: async (driverId) => {
    const res = await fetch(`${API_URL}/api/delivery/drivers/${driverId}/deliveries`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to fetch deliveries');
    return data;
  },
  getDeliveryHistory: async (page = 1, limit = 20) => {
    const res = await fetch(`${API_URL}/api/delivery/deliveries/history?page=${page}&limit=${limit}`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to fetch delivery history');
    return data;
  },
  getDeliveryByOrderId: async (orderId) => {
    const res = await fetch(`${API_URL}/api/delivery/deliveries/order/${orderId}`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to fetch delivery');
    return data.delivery || data;
  },
  rateDelivery: async (deliveryId, payload) => {
    const res = await fetch(`${API_URL}/api/delivery/deliveries/${deliveryId}/rate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to rate delivery');
    return data;
  },
  getAdminDriverFeedback: async () => {
    const res = await fetch(`${API_URL}/api/delivery/admin/feedback`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to fetch driver feedback');
    return data;
  },

  // Notifications (notification-service via gateway)
  getNotifications: async (page = 1, limit = 20) => {
    const res = await fetch(`${API_URL}/api/notifications/me?page=${page}&limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to load notifications');
    return data;
  },
  markNotificationRead: async (id) => {
    const res = await fetch(`${API_URL}/api/notifications/${id}/read`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to update');
    return data;
  },
  markAllNotificationsRead: async () => {
    const res = await fetch(`${API_URL}/api/notifications/read-all`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed');
    return data;
  },
  getNotificationPreferences: async () => {
    const res = await fetch(`${API_URL}/api/notifications/preferences/me`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to load preferences');
    return data.preferences || data;
  },
  updateNotificationPreferences: async (prefs) => {
    const res = await fetch(`${API_URL}/api/notifications/preferences/me`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(prefs),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Failed to save');
    return data.preferences || data;
  },

  // Addresses (via user profile)
  getFullProfile: async () => {
    const res = await fetch(`${API_URL}/users/profile/full`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to fetch profile');
    return data;
  },
  getAddresses: async () => {
    const res = await fetch(`${API_URL}/users/profile/full`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to fetch addresses');
    return data.user?.addresses || [];
  },
  addAddress: async (addressData) => {
    const res = await fetch(`${API_URL}/users/profile/addresses`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(addressData),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to add address');
    return data;
  },
  updateAddress: async (addressId, addressData) => {
    const res = await fetch(`${API_URL}/users/profile/addresses/${addressId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(addressData),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to update address');
    return data;
  },
  deleteAddress: async (addressId) => {
    const res = await fetch(`${API_URL}/users/profile/addresses/${addressId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to delete address');
    return data;
  },
  getCoupons: async () => {
    const res = await fetch(`${API_URL}/api/coupons`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to fetch coupons');
    return data.data || data;
  },
  createCoupon: async (couponData) => {
    const res = await fetch(`${API_URL}/api/coupons`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(couponData),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to create coupon');
    return data;
  },
  setDefaultAddress: async (addressId) => {
    const res = await fetch(`${API_URL}/users/profile/addresses/${addressId}/default`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to set default address');
    return data;
  },

  // Register with OTP
  registerRequestOTP: async ({ email, contactNumber }) => {
    const res = await fetch(`${API_URL}/auth/register/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, contactNumber }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
    return data;
  },
  registerVerifyOTP: async (payload) => {
    const res = await fetch(`${API_URL}/auth/register/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to verify');
    return data;
  },

  // Profile picture (URL string or FormData with 'profilePicture' file)
  updateProfilePicture: async (formDataOrUrl) => {
    const isFormData = formDataOrUrl instanceof FormData;
    const headers = { ...getAuthHeaders() };
    if (isFormData) delete headers['Content-Type'];
    else headers['Content-Type'] = 'application/json';
    const res = await fetch(`${API_URL}/users/profile/picture`, {
      method: 'PUT',
      headers,
      body: isFormData ? formDataOrUrl : JSON.stringify({ profilePictureUrl: formDataOrUrl }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to update picture');
    return data;
  },

  // Saved restaurants
  addSavedRestaurant: async (restaurantId, name) => {
    const res = await fetch(`${API_URL}/users/profile/saved-restaurants`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ restaurantId, name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to save restaurant');
    return data;
  },
  removeSavedRestaurant: async (restaurantId) => {
    const res = await fetch(`${API_URL}/users/profile/saved-restaurants/${restaurantId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to remove');
    return data;
  },
  getSavedRestaurants: async () => {
    const res = await fetch(`${API_URL}/users/profile/saved-restaurants`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to fetch');
    return data.savedRestaurants || [];
  },

  // Favorite foods
  addFavoriteFood: async (menuItemId, name) => {
    const res = await fetch(`${API_URL}/users/profile/favorite-foods`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ menuItemId, name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to add');
    return data;
  },
  removeFavoriteFood: async (menuItemId) => {
    const res = await fetch(`${API_URL}/users/profile/favorite-foods/${menuItemId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to remove');
    return data;
  },
  getFavoriteFoods: async () => {
    const res = await fetch(`${API_URL}/users/profile/favorite-foods`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to fetch');
    return data.favoriteFoods || [];
  },

  // Dietary preferences
  updateDietaryPreferences: async (prefs) => {
    const res = await fetch(`${API_URL}/users/profile/dietary-preferences`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(prefs),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to update');
    return data;
  },
  getDietaryPreferences: async () => {
    const res = await fetch(`${API_URL}/users/profile/dietary-preferences`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to fetch');
    return data.dietaryPreferences || {};
  },

  // Sessions
  getSessions: async () => {
    const res = await fetch(`${API_URL}/users/profile/sessions`, { headers: getAuthHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to fetch sessions');
    return data.sessions || [];
  },
  revokeSession: async (sessionId) => {
    const res = await fetch(`${API_URL}/users/profile/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to revoke');
    return data;
  },

  // Account deactivation
  deactivateAccount: async (password, reason) => {
    const res = await fetch(`${API_URL}/users/profile/deactivate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ password, reason }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to deactivate');
    return data;
  },
  requestReactivationOTP: async (email) => {
    const res = await fetch(`${API_URL}/auth/reactivate/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
    return data;
  },
  reactivateAccount: async ({ email, otp, newPassword }) => {
    const res = await fetch(`${API_URL}/auth/reactivate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Failed to reactivate');
    return data;
  },
};
