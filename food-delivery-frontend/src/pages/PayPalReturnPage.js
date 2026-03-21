import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useCart } from '../context/CartContext';

const PAYPAL_SESSION_KEY = 'feedo_paypal_order';

const PayPalReturnPage = () => {
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      const raw = sessionStorage.getItem(PAYPAL_SESSION_KEY);
      if (!raw) {
        setError('Session expired. Return to checkout and try again.');
        setStatus('error');
        return;
      }
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        setError('Invalid session data.');
        setStatus('error');
        return;
      }
      const { orderData, paypalOrderId } = payload;
      if (!orderData || !paypalOrderId) {
        setError('Missing PayPal order context.');
        setStatus('error');
        return;
      }
      try {
        await api.capturePaypal(paypalOrderId);
        await api.createOrder({
          ...orderData,
          paymentMethod: 'PAYPAL',
          paymentId: paypalOrderId,
          paymentStatus: 'COMPLETED',
        });
        sessionStorage.removeItem(PAYPAL_SESSION_KEY);
        clearCart();
        setStatus('success');
        setTimeout(() => navigate('/orders'), 1200);
      } catch (e) {
        setError(e.message || 'Could not complete order');
        setStatus('error');
      }
    };
    run();
  }, [clearCart, navigate]);

  if (status === 'error') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="card p-8 rounded-2xl border border-red-100 bg-red-50/50">
          <p className="text-red-800 font-medium">{error}</p>
          <button type="button" onClick={() => navigate('/checkout')} className="btn-primary mt-6">
            Back to checkout
          </button>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="card p-10 rounded-2xl border border-emerald-100 bg-emerald-50/50">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-2xl">✓</div>
          <p className="text-emerald-900 font-display font-semibold text-lg">Order placed with PayPal</p>
          <p className="text-gray-600 text-sm mt-2">Redirecting to your orders…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="inline-flex items-center gap-3 text-gray-700">
        <svg className="animate-spin h-8 w-8 text-primary-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="font-medium">Confirming PayPal payment…</span>
      </div>
    </div>
  );
};

export default PayPalReturnPage;
