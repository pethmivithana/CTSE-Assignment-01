const axios = require('axios');

const RESTAURANT_SERVICE_URL = process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3002';

exports.getManagerId = async (restaurantId) => {
  try {
    const { data } = await axios.get(`${RESTAURANT_SERVICE_URL}/api/restaurants/${restaurantId}`, { timeout: 5000 });
    return data?.managerId ? String(data.managerId) : null;
  } catch {
    return null;
  }
};
