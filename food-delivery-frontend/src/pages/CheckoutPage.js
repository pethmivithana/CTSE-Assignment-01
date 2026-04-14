import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import OrderSummary from '../components/OrderSummary';
import { api } from '../services/api';

const stripePromise = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY)
  : null;

const PENDING_ORDER_KEY = 'feedo_pending_order';
const PAYPAL_SESSION_KEY = 'feedo_paypal_order';
const TAX_RATE = Number(process.env.REACT_APP_ORDER_TAX_RATE ?? 0.05);

/** Aligns with order-service: saved address sends addressId + deliveryAddress for User Service validation */
function buildDeliveryPayload({ addresses, street, city, postalCode, useNewAddress, selectedAddressId }) {
  if (addresses.length > 0 && !useNewAddress && selectedAddressId) {
    const addr = addresses.find((a) => a._id === selectedAddressId);
    if (addr) {
      return {
        deliveryAddress: {
          street: addr.street,
          city: addr.city,
          postalCode: addr.postalCode,
          additionalInfo: addr.additionalInfo || '',
        },
        addressId: selectedAddressId,
      };
    }
  }
  const addressParts = street.split(',').map((s) => s.trim());
  return {
    deliveryAddress: {
      street: addressParts[0] || street,
      city: city || addressParts[1] || 'City',
      postalCode: postalCode || addressParts[2] || '00000',
      additionalInfo: '',
    },
  };
}

// Form used when Stripe Elements is available (clientSecret present)
const StripeCheckoutForm = ({
  addresses, selectedAddressId, setSelectedAddressId, street, setStreet, city, setCity,
  postalCode, setPostalCode, useNewAddress, setUseNewAddress, contactPhone, setContactPhone,
  paymentMethod, setPaymentMethod, couponCode, discount, restaurant, user, cart, clearCart,
  getTotalPrice, couponError, couponLoading, clientSecret, deliveryFee = 150, orderTotal = 0,
  walletBalance,
}) => {
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const isCardStripe = paymentMethod === 'CREDIT_CARD';
  const isSimulatedCard = isCardStripe && !clientSecret;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);

    try {
      const delivery = buildDeliveryPayload({
        addresses,
        street,
        city,
        postalCode,
        useNewAddress,
        selectedAddressId,
      });

      const orderData = {
        restaurantId: restaurant._id || restaurant.id,
        items: cart.map((item) => ({
          itemId: item._id || item.id,
          name: item.name || item.foodName,
          price: item.price,
          quantity: item.quantity,
          size: item.size,
          servings: item.servings,
          imageUrl: item.imageUrl || item.image,
        })),
        ...delivery,
        contactPhone: contactPhone || user?.contactNumber,
        paymentMethod,
        deliveryFee: deliveryFee || 150,
        ...(couponCode && { couponCode }),
      };

      if (paymentMethod === 'PAYPAL') {
        const paypalRes = await api.createPaypalOrder({
          customerId: user._id || user.id,
          amount: orderTotal,
          currency: 'LKR',
          orderRef: `order_${Date.now()}`,
          metadata: { restaurantId: restaurant._id || restaurant.id },
          returnUrl: `${window.location.origin}/checkout/paypal-return`,
          cancelUrl: `${window.location.origin}/checkout`,
        });
        sessionStorage.setItem(
          PAYPAL_SESSION_KEY,
          JSON.stringify({
            orderData: { ...orderData, paymentMethod: 'PAYPAL' },
            paypalOrderId: paypalRes.paypalOrderId,
          }),
        );
        window.location.href = paypalRes.approvalUrl;
        return;
      }

      if (paymentMethod === 'WALLET') {
        const wp = await api.walletPay({
          customerId: user._id || user.id,
          amount: orderTotal,
          currency: 'LKR',
          orderRef: `order_${Date.now()}`,
          metadata: { restaurantId: restaurant._id || restaurant.id },
        });
        await api.createOrder({
          ...orderData,
          paymentMethod: 'WALLET',
          paymentId: wp.paymentId,
          paymentStatus: 'COMPLETED',
        });
        clearCart();
        navigate('/orders');
        return;
      }

      if (clientSecret && stripe && elements && isCardStripe) {
        sessionStorage.setItem(PENDING_ORDER_KEY, JSON.stringify({ orderData }));
        const returnUrl = `${window.location.origin}/checkout/complete`;
        const { error: confirmError } = await stripe.confirmPayment({
          elements,
          confirmParams: { return_url: returnUrl },
        });
        if (confirmError) {
          sessionStorage.removeItem(PENDING_ORDER_KEY);
          throw new Error(confirmError.message);
        }
        return;
      }

      let paymentId = null;
      let paymentStatus = null;
      if (isSimulatedCard) {
        const paymentRes = await api.createPayment({
          customerId: user._id || user.id,
          amount: orderTotal,
          currency: 'LKR',
          paymentMethod: 'CREDIT_CARD',
          orderRef: `order_${Date.now()}`,
          metadata: { restaurantId: restaurant._id || restaurant.id },
        });
        if (!paymentRes.success || paymentRes.status !== 'COMPLETED') {
          throw new Error(paymentRes.message || 'Payment failed. Use Cash on Delivery.');
        }
        paymentId = paymentRes.paymentId;
        paymentStatus = paymentRes.status;
      }

      const created = await api.createOrder({
        ...orderData,
        ...(paymentId && { paymentId, paymentStatus }),
      });
      if (paymentMethod === 'CASH_ON_DELIVERY' && created?.data?._id) {
        api
          .recordCodPayment({
            customerId: user._id || user.id,
            amount: orderTotal,
            orderId: created.data._id,
          })
          .catch(() => {});
      }
      clearCart();
      navigate('/orders');
    } catch (err) {
      setError(err.message || 'Failed to place order');
    } finally {
      setIsProcessing(false);
    }
  };

  const showStripeForm = isCardStripe && clientSecret && stripe && elements;
  const canSubmit =
    !isProcessing &&
    contactPhone.trim() &&
    (addresses.length > 0 && !useNewAddress ? selectedAddressId : street.trim() && city.trim() && postalCode.trim()) &&
    (!showStripeForm || (stripe && elements)) &&
    !(paymentMethod === 'WALLET' && walletBalance != null && walletBalance < orderTotal);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>
      )}

      <div>
        <h2 className="font-display font-semibold text-gray-800 mb-4">Delivery Address</h2>
        {addresses.length > 0 && !useNewAddress ? (
          <div className="space-y-3 mb-4">
            {addresses.map((addr) => (
              <label
                key={addr._id}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedAddressId === addr._id ? 'border-primary-500 bg-primary-50/50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="address"
                  checked={selectedAddressId === addr._id}
                  onChange={() => setSelectedAddressId(addr._id)}
                  className="mt-1 w-4 h-4 text-primary-500"
                />
                <div>
                  <span className="font-medium text-gray-800 capitalize">{addr.label}</span>
                  {addr.isDefault && (
                    <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-primary-100 text-primary-700">Default</span>
                  )}
                  <p className="text-sm text-gray-600 mt-0.5">{addr.street}, {addr.city} {addr.postalCode}</p>
                </div>
              </label>
            ))}
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setUseNewAddress(true)} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                + Use a new address
              </button>
              <button type="button" onClick={() => navigate('/profile/addresses')} className="text-sm text-gray-500 hover:text-gray-700">
                Manage addresses
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {addresses.length > 0 && useNewAddress && (
              <button
                type="button"
                onClick={() => { setUseNewAddress(false); setStreet(''); setCity(''); setPostalCode(''); }}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                ← Choose from saved addresses
              </button>
            )}
            <input value={street} onChange={(e) => setStreet(e.target.value)} className="input-field" placeholder="Street address" required />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input value={city} onChange={(e) => setCity(e.target.value)} className="input-field" placeholder="City" required />
              <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="input-field" placeholder="Postal code" required />
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block font-display font-semibold text-gray-800 mb-2">Contact Phone</label>
        <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="input-field" placeholder="+1234567890" required />
      </div>

      <div>
        <h2 className="font-display font-semibold text-gray-800 mb-4">Payment method</h2>
        <p className="text-sm text-gray-500 mb-3">Choose how you’d like to pay — secured by Stripe, PayPal, or your Feedo wallet.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { id: 'CASH_ON_DELIVERY', title: 'Cash on delivery', sub: 'Pay when you receive', icon: '💵' },
            { id: 'CREDIT_CARD', title: 'Card (Stripe)', sub: 'Visa, Mastercard, etc.', icon: '💳' },
            { id: 'WALLET', title: 'Feedo wallet', sub: walletBalance != null ? `Balance LKR ${Number(walletBalance).toFixed(2)}` : 'In-app balance', icon: '👛' },
            { id: 'PAYPAL', title: 'PayPal', sub: 'Pay with PayPal account', icon: 'PP' },
          ].map((m) => (
            <label
              key={m.id}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                paymentMethod === m.id ? 'border-primary-500 bg-primary-50/60 shadow-sm' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="payment"
                value={m.id}
                checked={paymentMethod === m.id}
                onChange={() => setPaymentMethod(m.id)}
                className="mt-1 w-4 h-4 text-primary-500"
              />
              <div>
                <span className="font-semibold text-gray-800 flex items-center gap-2">
                  <span className="text-lg" aria-hidden>{m.icon}</span>
                  {m.title}
                </span>
                <p className="text-xs text-gray-500 mt-0.5">{m.sub}</p>
              </div>
            </label>
          ))}
        </div>
        {paymentMethod === 'WALLET' && walletBalance != null && walletBalance < orderTotal && (
          <p className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Insufficient wallet balance. Add funds from Profile → Payments & wallet (demo top-up).
          </p>
        )}

        {showStripeForm && (
          <div className="mt-4 p-4 rounded-xl border border-gray-200 bg-gray-50/50">
            <PaymentElement options={{ layout: 'tabs' }} onReady={() => {}} />
          </div>
        )}
      </div>

      <button type="submit" disabled={!canSubmit} className={`btn-primary w-full py-3.5 ${isProcessing ? 'opacity-70' : ''}`}>
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Placing order...
          </span>
        ) : (
          'Place Order'
        )}
      </button>
    </form>
  );
};

// Form used when Stripe is NOT configured (no Elements - uses simulated payment)
const SimpleCheckoutForm = ({
  addresses, selectedAddressId, setSelectedAddressId, street, setStreet, city, setCity,
  postalCode, setPostalCode, useNewAddress, setUseNewAddress, contactPhone, setContactPhone,
  paymentMethod, setPaymentMethod, couponCode, discount, restaurant, user, cart, clearCart,
  getTotalPrice, couponError, couponLoading, paymentIntentError, deliveryFee = 150, orderTotal = 0,
  walletBalance,
}) => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const isCardSimulated = paymentMethod === 'CREDIT_CARD';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);
    try {
      const delivery = buildDeliveryPayload({
        addresses,
        street,
        city,
        postalCode,
        useNewAddress,
        selectedAddressId,
      });
      const orderData = {
        restaurantId: restaurant._id || restaurant.id,
        items: cart.map((item) => ({
          itemId: item._id || item.id,
          name: item.name || item.foodName,
          price: item.price,
          quantity: item.quantity,
          size: item.size,
          servings: item.servings,
          imageUrl: item.imageUrl || item.image,
        })),
        ...delivery,
        contactPhone: contactPhone || user?.contactNumber,
        paymentMethod,
        deliveryFee: deliveryFee || 150,
        ...(couponCode && { couponCode }),
      };

      if (paymentMethod === 'PAYPAL') {
        const paypalRes = await api.createPaypalOrder({
          customerId: user._id || user.id,
          amount: orderTotal,
          currency: 'LKR',
          orderRef: `order_${Date.now()}`,
          metadata: { restaurantId: restaurant._id || restaurant.id },
          returnUrl: `${window.location.origin}/checkout/paypal-return`,
          cancelUrl: `${window.location.origin}/checkout`,
        });
        sessionStorage.setItem(
          PAYPAL_SESSION_KEY,
          JSON.stringify({
            orderData: { ...orderData, paymentMethod: 'PAYPAL' },
            paypalOrderId: paypalRes.paypalOrderId,
          }),
        );
        window.location.href = paypalRes.approvalUrl;
        return;
      }

      if (paymentMethod === 'WALLET') {
        const wp = await api.walletPay({
          customerId: user._id || user.id,
          amount: orderTotal,
          currency: 'LKR',
          orderRef: `order_${Date.now()}`,
          metadata: { restaurantId: restaurant._id || restaurant.id },
        });
        await api.createOrder({
          ...orderData,
          paymentMethod: 'WALLET',
          paymentId: wp.paymentId,
          paymentStatus: 'COMPLETED',
        });
        clearCart();
        navigate('/orders');
        return;
      }

      let paymentId = null;
      let paymentStatus = null;
      if (isCardSimulated) {
        const paymentRes = await api.createPayment({
          customerId: user._id || user.id,
          amount: orderTotal,
          currency: 'LKR',
          paymentMethod: 'CREDIT_CARD',
          orderRef: `order_${Date.now()}`,
          metadata: { restaurantId: restaurant._id || restaurant.id },
        });
        if (!paymentRes.success || paymentRes.status !== 'COMPLETED') {
          throw new Error(paymentRes.message || 'Payment failed. Use Cash on Delivery.');
        }
        paymentId = paymentRes.paymentId;
        paymentStatus = paymentRes.status;
      }
      const created = await api.createOrder({ ...orderData, ...(paymentId && { paymentId, paymentStatus }) });
      if (paymentMethod === 'CASH_ON_DELIVERY' && created?.data?._id) {
        api
          .recordCodPayment({
            customerId: user._id || user.id,
            amount: orderTotal,
            orderId: created.data._id,
          })
          .catch(() => {});
      }
      clearCart();
      navigate('/orders');
    } catch (err) {
      setError(err.message || 'Failed to place order');
    } finally {
      setIsProcessing(false);
    }
  };

  const canSubmit =
    !isProcessing &&
    contactPhone.trim() &&
    (addresses.length > 0 && !useNewAddress ? selectedAddressId : street.trim() && city.trim() && postalCode.trim()) &&
    !(paymentMethod === 'WALLET' && walletBalance != null && walletBalance < orderTotal);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>}
      <div>
        <h2 className="font-display font-semibold text-gray-800 mb-4">Delivery Address</h2>
        {addresses.length > 0 && !useNewAddress ? (
          <div className="space-y-3 mb-4">
            {addresses.map((addr) => (
              <label key={addr._id} className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedAddressId === addr._id ? 'border-primary-500 bg-primary-50/50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" name="address" checked={selectedAddressId === addr._id} onChange={() => setSelectedAddressId(addr._id)} className="mt-1 w-4 h-4 text-primary-500" />
                <div>
                  <span className="font-medium text-gray-800 capitalize">{addr.label}</span>
                  {addr.isDefault && <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-primary-100 text-primary-700">Default</span>}
                  <p className="text-sm text-gray-600 mt-0.5">{addr.street}, {addr.city} {addr.postalCode}</p>
                </div>
              </label>
            ))}
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setUseNewAddress(true)} className="text-sm text-primary-600 hover:text-primary-700 font-medium">+ Use a new address</button>
              <button type="button" onClick={() => navigate('/profile/addresses')} className="text-sm text-gray-500 hover:text-gray-700">Manage addresses</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {addresses.length > 0 && useNewAddress && (
              <button type="button" onClick={() => { setUseNewAddress(false); setStreet(''); setCity(''); setPostalCode(''); }} className="text-sm text-primary-600 hover:text-primary-700 font-medium">← Choose from saved addresses</button>
            )}
            <input value={street} onChange={(e) => setStreet(e.target.value)} className="input-field" placeholder="Street address" required />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input value={city} onChange={(e) => setCity(e.target.value)} className="input-field" placeholder="City" required />
              <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="input-field" placeholder="Postal code" required />
            </div>
          </div>
        )}
      </div>
      <div>
        <label className="block font-display font-semibold text-gray-800 mb-2">Contact Phone</label>
        <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="input-field" placeholder="+1234567890" required />
      </div>
      <div>
        <h2 className="font-display font-semibold text-gray-800 mb-4">Payment method</h2>
        <p className="text-sm text-gray-500 mb-3">Stripe not configured — card payments are simulated. PayPal & wallet use live APIs when enabled.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { id: 'CASH_ON_DELIVERY', title: 'Cash on delivery', sub: 'Pay when you receive', icon: '💵' },
            { id: 'CREDIT_CARD', title: 'Card (simulated)', sub: 'No Stripe keys on server', icon: '💳' },
            { id: 'WALLET', title: 'Feedo wallet', sub: walletBalance != null ? `Balance LKR ${Number(walletBalance).toFixed(2)}` : 'In-app balance', icon: '👛' },
            { id: 'PAYPAL', title: 'PayPal', sub: 'Secure PayPal checkout', icon: 'PP' },
          ].map((m) => (
            <label
              key={m.id}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                paymentMethod === m.id ? 'border-primary-500 bg-primary-50/60 shadow-sm' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="payment2"
                value={m.id}
                checked={paymentMethod === m.id}
                onChange={() => setPaymentMethod(m.id)}
                className="mt-1 w-4 h-4 text-primary-500"
              />
              <div>
                <span className="font-semibold text-gray-800 flex items-center gap-2">
                  <span className="text-lg" aria-hidden>{m.icon}</span>
                  {m.title}
                </span>
                <p className="text-xs text-gray-500 mt-0.5">{m.sub}</p>
              </div>
            </label>
          ))}
        </div>
        {paymentMethod === 'WALLET' && walletBalance != null && walletBalance < orderTotal && (
          <p className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Insufficient wallet balance. Add funds from Profile → Payments & wallet.
          </p>
        )}
        {isCardSimulated && (
          <div className="mt-2 space-y-1">
            {paymentIntentError ? (
              <p className="text-sm text-red-600">{paymentIntentError}</p>
            ) : (
              <p className="text-sm text-amber-600">Simulated card payment — no real card charge.</p>
            )}
          </div>
        )}
      </div>
      <button type="submit" disabled={!canSubmit} className={`btn-primary w-full py-3.5 ${isProcessing ? 'opacity-70' : ''}`}>
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
            Placing order...
          </span>
        ) : (
          'Place Order'
        )}
      </button>
    </form>
  );
};

const CheckoutPage = () => {
  const { cart, restaurant, clearCart, getTotalPrice } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [contactPhone, setContactPhone] = useState(user?.contactNumber || '');
  const [paymentMethod, setPaymentMethod] = useState('CASH_ON_DELIVERY');
  const [clientSecret, setClientSecret] = useState('');
  const [paymentIntentError, setPaymentIntentError] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(150);


  useEffect(() => {
    if (!restaurant || (!street && (!addresses.length || !selectedAddressId))) {
      setDeliveryFee(150);
      return;
    }
    const pickupLat = restaurant?.location?.latitude ?? 6.9271;
    const pickupLon = restaurant?.location?.longitude ?? 79.8612;
    const dropoffLat = 6.9271;
    const dropoffLon = 79.8612;
    let mounted = true;
    api
      .calculateDeliveryFee(pickupLat, pickupLon, dropoffLat, dropoffLon, getTotalPrice())
      .then((res) => {
        if (mounted && res.success) setDeliveryFee(res.fee ?? 150);
      })
      .catch(() => { if (mounted) setDeliveryFee(150); });
    return () => { mounted = false; };
  }, [restaurant, street, city, selectedAddressId, addresses.length, getTotalPrice]);

  useEffect(() => {
    if (!user) navigate('/profile');
    else if (cart.length === 0) navigate('/restaurants');
  }, [user, cart, navigate]);

  useEffect(() => {
    if (user?.contactNumber) setContactPhone(user.contactNumber);
  }, [user]);

  useEffect(() => {
    if (user) {
      api
        .getAddresses()
        .then((list) => {
          setAddresses(Array.isArray(list) ? list : []);
          const defaultAddr = list?.find((a) => a.isDefault) || list?.[0];
          if (defaultAddr && !useNewAddress) {
            setSelectedAddressId(defaultAddr._id);
            setStreet(defaultAddr.street);
            setCity(defaultAddr.city);
            setPostalCode(defaultAddr.postalCode);
          }
        })
        .catch(() => setAddresses([]));
    }
  }, [user, useNewAddress]);

  useEffect(() => {
    if (selectedAddressId && !useNewAddress) {
      const addr = addresses.find((a) => a._id === selectedAddressId);
      if (addr) {
        setStreet(addr.street);
        setCity(addr.city);
        setPostalCode(addr.postalCode);
      }
    }
  }, [selectedAddressId, useNewAddress, addresses]);

  useEffect(() => {
    const cid = user?._id || user?.id;
    if (!cid) return;
    api
      .getWalletBalance(cid)
      .then((res) => {
        if (res.success != null) setWalletBalance(res.balance);
      })
      .catch(() => setWalletBalance(null));
  }, [user]);

  const subtotal = getTotalPrice();
  const tax = Math.max(0, (subtotal - discount) * TAX_RATE);
  const orderTotal = Math.max(0, subtotal + deliveryFee + tax - discount);
  const isCardForStripe = paymentMethod === 'CREDIT_CARD';

  useEffect(() => {
    if (!isCardForStripe || !stripePromise) {
      setPaymentIntentError('');
      if (!isCardForStripe) setClientSecret('');
      return;
    }
    if (orderTotal <= 0) {
      setPaymentIntentError('');
      setClientSecret('');
      return;
    }
    setPaymentIntentError('');
    let mounted = true;
    const idem = `checkout_${user?._id || user?.id}_${restaurant?._id || restaurant?.id || 'r'}_${orderTotal.toFixed(2)}`;
    api
      .createPaymentIntent(
        {
          customerId: user?._id || user?.id,
          amount: orderTotal,
          currency: 'LKR',
          orderRef: `order_${Date.now()}`,
          metadata: { restaurantId: restaurant?._id || restaurant?.id },
        },
        { idempotencyKey: idem },
      )
      .then((res) => {
        if (!mounted) return;
        if (res.clientSecret) {
          setClientSecret(res.clientSecret);
          setPaymentIntentError('');
        } else if (res.useFallback) {
          setPaymentIntentError('Stripe not configured on server. Add STRIPE_SECRET_KEY to the payment service.');
        }
      })
      .catch((err) => {
        if (mounted) setPaymentIntentError(err.message || 'Could not connect to payment service. Ensure it is running on port 3006.');
      });
    return () => { mounted = false; };
  }, [isCardForStripe, orderTotal, user, restaurant]);

  const options = clientSecret ? { clientSecret } : {};
  const formProps = {
    addresses,
    selectedAddressId,
    setSelectedAddressId,
    street,
    setStreet,
    city,
    setCity,
    postalCode,
    setPostalCode,
    useNewAddress,
    setUseNewAddress,
    contactPhone,
    setContactPhone,
    paymentMethod,
    setPaymentMethod,
    couponCode,
    discount,
    restaurant,
    user,
    cart,
    clearCart,
    getTotalPrice,
    handleApplyCoupon: async (code) => {
      setCouponError('');
      setCouponLoading(true);
      try {
        const res = await api.validateCoupon(code, getTotalPrice());
        if (res.valid && res.discountAmount) {
          setCouponCode(res.code || code);
          setDiscount(res.discountAmount);
        } else {
          setCouponError(res.message || 'Invalid coupon');
        }
      } catch (err) {
        setCouponError(err.message || 'Failed to validate coupon');
      } finally {
        setCouponLoading(false);
      }
    },
    couponError,
    couponLoading,
    clientSecret: clientSecret || null,
    paymentIntentError,
    deliveryFee,
    finalAmount: orderTotal,
  };

  const form = stripePromise && clientSecret ? (
    <Elements stripe={stripePromise} options={options}>
      <StripeCheckoutForm {...formProps} clientSecret={clientSecret} />
    </Elements>
  ) : (
    <SimpleCheckoutForm {...formProps} />
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl md:text-3xl font-display font-bold text-gray-800 mb-8">Checkout</h1>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:flex-1">
          <div className="card p-6 sm:p-8 shadow-md">{form}</div>
        </div>
        <div className="lg:w-96 flex-shrink-0">
          <OrderSummary
            showCheckoutButton={false}
            discount={discount}
            couponCode={couponCode}
            showCouponInput
            onApplyCoupon={formProps.handleApplyCoupon}
            couponError={couponError}
            couponLoading={couponLoading}
            deliveryFee={deliveryFee}
            grandTotal={orderTotal}
          />
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
