import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';

const OrderSummary = ({
  showCheckoutButton = true,
  onCheckout = () => {},
  discount = 0,
  couponCode = '',
  showCouponInput = false,
  onApplyCoupon,
  couponError = '',
  couponLoading = false,
  eligibleCoupons = [],
  deliveryFee = 150,
  /** When set, must match the amount sent to payment APIs */
  grandTotal = null,
}) => {
  const { currentTheme } = useTheme();
  const { cart, getTotalPrice, restaurant } = useCart();

  const address = restaurant?.location?.address
    ? `${restaurant.location.address}${restaurant.location.city ? `, ${restaurant.location.city}` : ''}`
    : restaurant?.address || '';
  const taxRate = Number(process.env.REACT_APP_ORDER_TAX_RATE ?? 0.05);
  const subtotal = getTotalPrice();
  const tax = Math.max(0, (subtotal - discount) * taxRate);
  const computedTotal = Math.max(0, subtotal + deliveryFee + tax - discount);
  const total = grandTotal != null ? grandTotal : computedTotal;

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-lg p-6 sticky top-24">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-gray-900">Order Summary</h2>
        <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">Secure checkout</span>
      </div>

      {restaurant && (
        <div className="mb-4 pb-4 border-b border-gray-100">
          <h3 className="font-medium text-gray-800">{restaurant.name}</h3>
          {address && <p className="text-sm text-gray-500 mt-0.5">{address}</p>}
        </div>
      )}

      <div className="space-y-2.5 mb-4">
        <div className="flex justify-between text-gray-600 text-sm">
          <span>Subtotal</span>
          <span>LKR {subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600 text-sm">
          <span>Delivery</span>
          <span>LKR {deliveryFee.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600 text-sm">
          <span>Tax ({Math.round(taxRate * 100)}%)</span>
          <span>LKR {tax.toFixed(2)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-green-600 text-sm">
            <span>Discount{couponCode ? ` (${couponCode})` : ''}</span>
            <span>-LKR {discount.toFixed(2)}</span>
          </div>
        )}
      </div>

      {showCouponInput && onApplyCoupon && (
        <div className="mb-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Coupons</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Promo code"
              id="coupon-input"
              className="input-field py-2 text-sm flex-1"
              disabled={!!couponCode}
            />
            <button
              type="button"
              onClick={() => {
                const input = document.getElementById('coupon-input');
                if (input?.value?.trim()) onApplyCoupon(input.value.trim());
              }}
              disabled={couponLoading || !!couponCode}
              className="btn-secondary py-2 px-4 text-sm whitespace-nowrap"
            >
              {couponCode ? 'Applied' : couponLoading ? 'Applying...' : 'Apply'}
            </button>
          </div>
          {couponError && <p className="text-red-500 text-xs mt-1">{couponError}</p>}
          {!couponCode && Array.isArray(eligibleCoupons) && eligibleCoupons.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {eligibleCoupons.slice(0, 6).map((c) => (
                <button
                  key={c._id || c.code}
                  type="button"
                  onClick={() => onApplyCoupon(c.code)}
                  className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs hover:bg-emerald-100 transition-colors"
                >
                  {c.code} ({c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `LKR ${Number(c.discountValue || 0).toFixed(0)}`})
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between font-display font-semibold text-lg text-gray-800 pt-4 border-t border-dashed border-gray-200">
        <span>Total</span>
        <span>LKR {total.toFixed(2)}</span>
      </div>

      {showCheckoutButton && (
        <button
          onClick={onCheckout}
          disabled={cart.length === 0}
          className={`w-full mt-6 py-4 rounded-lg font-semibold text-white transition-all text-center ${
            cart.length === 0 ? 'bg-gray-300 cursor-not-allowed' : `${currentTheme.button} hover:opacity-95`
          }`}
        >
          Checkout
        </button>
      )}
    </div>
  );
};

export default OrderSummary;
