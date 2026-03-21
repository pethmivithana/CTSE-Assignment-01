const axios = require('axios');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:5002';

exports.getUserEmail = async (userId) => {
  try {
    const { data } = await axios.get(`${USER_SERVICE_URL}/users/internal/${userId}`, { timeout: 5000 });
    return data?.email || null;
  } catch {
    return null;
  }
};
