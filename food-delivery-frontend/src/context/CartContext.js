// src/context/CartContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [restaurant, setRestaurant] = useState(null);

  useEffect(() => {
    const savedCart = localStorage.getItem('foodAppCart');
    const savedRestaurant = localStorage.getItem('foodAppRestaurant');
    if (savedCart) {
      const parsed = JSON.parse(savedCart);
      const withKeys = parsed.map((item) => ({ ...item, cartKey: item.cartKey || `${item.id || item._id}-${item.size || 'default'}` }));
      setCart(withKeys);
    }
    if (savedRestaurant) setRestaurant(JSON.parse(savedRestaurant));
  }, []);

  useEffect(() => {
    localStorage.setItem('foodAppCart', JSON.stringify(cart));
    if (restaurant) localStorage.setItem('foodAppRestaurant', JSON.stringify(restaurant));
  }, [cart, restaurant]);

  const SIZES = { small: { label: 'Small', serves: 1 }, medium: { label: 'Medium', serves: 2 }, large: { label: 'Large', serves: 4 } };

  const normalizeItem = (item) => ({
    ...item,
    id: item.id || item._id,
    name: item.name || item.foodName,
    image: item.image || item.imageUrl,
    price: item.price || 0,
  });

  const getCartKey = (item, size) => `${(item.id || item._id)?.toString()}-${size || 'default'}`;

  const addToCart = (item, restaurantInfo, size = null) => {
    const norm = normalizeItem(item);
    const cartKey = getCartKey(norm, size);
    const cartItem = { ...norm, quantity: 1, size, cartKey, servings: size ? SIZES[size]?.serves : undefined };
    const restId = (restaurantInfo?.id || restaurantInfo?._id)?.toString();
    const currentRestId = (restaurant?.id || restaurant?._id)?.toString();

    if (restaurant && restId !== currentRestId) {
      if (window.confirm('Adding items from a new restaurant will clear your current cart. Continue?')) {
        setCart([cartItem]);
        setRestaurant(restaurantInfo);
      }
    } else {
      const exists = cart.find((c) => c.cartKey === cartKey);
      if (exists) {
        setCart(cart.map((c) => (c.cartKey === cartKey ? { ...c, quantity: c.quantity + 1 } : c)));
      } else {
        setCart([...cart, cartItem]);
        setRestaurant(restaurantInfo);
      }
    }
  };

  const removeFromCart = (cartKey) => {
    const exists = cart.find((item) => item.cartKey === cartKey);
    if (!exists) return;
    if (exists.quantity === 1) {
      const newCart = cart.filter((item) => item.cartKey !== cartKey);
      setCart(newCart);
      if (newCart.length === 0) setRestaurant(null);
    } else {
      setCart(cart.map((item) => (item.cartKey === cartKey ? { ...item, quantity: item.quantity - 1 } : item)));
    }
  };

  const clearCart = () => {
    setCart([]);
    setRestaurant(null);
  };

  /** Replace cart with reorder lines (same restaurant). Line items: { itemId, name, price, quantity, size, servings, imageUrl } */
  const loadReorderCart = (restaurantInfo, lineItems) => {
    if (!restaurantInfo || !Array.isArray(lineItems)) return;
    const rows = lineItems.map((raw) => {
      const norm = normalizeItem({ ...raw, _id: raw.itemId || raw._id, id: raw.itemId || raw.id });
      const size = raw.size || null;
      const cartKey = getCartKey(norm, size);
      return {
        ...norm,
        quantity: Math.max(1, Number(raw.quantity) || 1),
        size,
        cartKey,
        servings: size ? SIZES[size]?.serves : undefined,
        imageUrl: raw.imageUrl || norm.image,
      };
    });
    setRestaurant(restaurantInfo);
    setCart(rows);
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  return (
    <CartContext.Provider value={{ 
      cart, 
      restaurant, 
      addToCart, 
      removeFromCart, 
      clearCart,
      loadReorderCart,
      getTotalPrice 
    }}>
      {children}
    </CartContext.Provider>
  );
};