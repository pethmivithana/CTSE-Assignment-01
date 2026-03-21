import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useCart } from '../context/CartContext';

const PENDING_ORDER_KEY = 'feedo_pending_order';

const CheckoutCompletePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState('');

  useEffect(() => {
    const paymentIntent = searchParams.get('payment_intent');
    const redirectStatus = searchParams.get('redirect_status');
    const pending = sessionStorage.getItem(PENDING_ORDER_KEY);

    if (!paymentIntent || redirectStatus !== 'succeeded' || !pending) {
      if (!pending) setError('Session expired. Please try again.');
      else if (redirectStatus === 'processing') setStatus('processing');
      else setError('Payment was not completed.');
      return;
    }

    const completeOrder = async () => {
      try {
        const { orderData } = JSON.parse(pending);
        const orderPayload = {
          ...orderData,
          paymentId: paymentIntent,
          paymentStatus: 'COMPLETED',
        };
        await api.createOrder(orderPayload);
        sessionStorage.removeItem(PENDING_ORDER_KEY);
        clearCart();
        setStatus('success');
        setTimeout(() => navigate('/orders'), 1500);
      } catch (err) {
        setError(err.message || 'Failed to complete order');
        setStatus('error');
      }
    };

    completeOrder();
  }, [searchParams, navigate, clearCart]);

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="p-6 rounded-xl bg-red-50 border border-red-100">
          <p className="text-red-700 font-medium">{error}</p>
          <button onClick={() => navigate('/checkout')} className="mt-4 btn-primary">
            Back to Checkout
          </button>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="p-8 rounded-xl bg-green-50 border border-green-100">
          <p className="text-green-700 font-medium text-lg">Order placed successfully!</p>
          <p className="text-gray-600 mt-2">Redirecting to your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded mx-auto mb-4" />
        <div className="h-4 w-64 bg-gray-100 rounded mx-auto" />
      </div>
    </div>
  );
};

export default CheckoutCompletePage;
