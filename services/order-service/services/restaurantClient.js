const axios = require('axios');
const RESTAURANT_SERVICE_URL = process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3002';

exports.getRestaurantById = async (restaurantId) => {
  try {
    const res = await axios.get(`${RESTAURANT_SERVICE_URL}/api/restaurants/${restaurantId}`, {
      timeout: 5000,
    });
    return res.data;
  } catch (err) {
    console.warn('Restaurant fetch failed:', err.message);
    return null;
  }
};

/**
 * Fetch all menu items for a restaurant (for validation)
 */
exports.getMenuItemsForRestaurant = async (restaurantId) => {
  try {
    const res = await axios.get(`${RESTAURANT_SERVICE_URL}/api/menu-items`, {
      params: { restaurantId },
      timeout: 8000,
    });
    const data = res.data;
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Menu items fetch failed:', err.message);
    return null;
  }
};

/**
 * Validate order line items against restaurant menu: availability, stock, price match
 */
exports.validateOrderItemsAgainstMenu = (items, menuItems) => {
  if (!menuItems || !Array.isArray(menuItems)) {
    return { ok: false, message: 'Unable to verify menu with restaurant service' };
  }
  const byId = new Map(menuItems.map((m) => [String(m._id), m]));
  for (const line of items) {
    const id = String(line.itemId || line._id || '');
    const menu = byId.get(id);
    if (!menu) {
      return { ok: false, message: `Menu item not found: ${line.name || id}` };
    }
    if (menu.isAvailable === false) {
      return { ok: false, message: `Item unavailable: ${menu.foodName || line.name}` };
    }
    if (menu.isOutOfStock) {
      return { ok: false, message: `Item out of stock: ${menu.foodName || line.name}` };
    }
    if (menu.stockQuantity != null && menu.stockQuantity < (line.quantity || 1)) {
      return { ok: false, message: `Insufficient stock for: ${menu.foodName || line.name}` };
    }
    const expectedPrice = Number(line.price);
    const prices = menu.prices || {};
    let serverPrice = menu.price;
    if (line.size && prices[line.size] != null) serverPrice = prices[line.size];
    else if (prices.small != null) serverPrice = prices.small;
    if (serverPrice != null && Math.abs(Number(serverPrice) - expectedPrice) > 0.02) {
      return { ok: false, message: `Price changed for ${menu.foodName || line.name}. Refresh and try again.` };
    }
  }
  return { ok: true };
};
