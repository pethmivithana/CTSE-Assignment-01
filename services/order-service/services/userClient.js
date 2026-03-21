const axios = require('axios');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:5002';

async function getUserById(userId) {
  try {
    const response = await axios.get(`${USER_SERVICE_URL}/users/internal/${userId}`, { timeout: 5000 });
    return response.data;
  } catch (error) {
    console.error('Error fetching user:', error.message);
    return null;
  }
}

/** Get customer email and name for notifications (internal endpoint) */
async function getCustomerForNotification(customerId) {
  const data = await getUserById(customerId);
  return data ? { email: data.email, fullName: data.fullName } : null;
}

/**
 * Validate delivery address against user's saved addresses (Bearer token)
 */
async function validateUserAddress(token, deliveryAddress, addressId) {
  try {
    const res = await axios.get(`${USER_SERVICE_URL}/users/profile/full`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 8000,
    });
    const body = res.data;
    const user = body.user || body;
    const addresses = user.addresses || [];
    if (!addresses.length) {
      return { ok: true, warning: 'No saved addresses; using provided address' };
    }
    if (addressId) {
      const match = addresses.find((a) => String(a._id) === String(addressId));
      if (!match) {
        return { ok: false, message: 'Selected address not found in your profile' };
      }
      const street = (deliveryAddress.street || '').trim();
      const city = (deliveryAddress.city || '').trim();
      if (
        street &&
        city &&
        (match.street || '').trim() !== street &&
        (match.city || '').trim() !== city
      ) {
        return { ok: false, message: 'Delivery address does not match selected saved address' };
      }
      return { ok: true };
    }
    const street = (deliveryAddress.street || '').trim().toLowerCase();
    const city = (deliveryAddress.city || '').trim().toLowerCase();
    const found = addresses.some(
      (a) =>
        (a.street || '').trim().toLowerCase() === street &&
        (a.city || '').trim().toLowerCase() === city,
    );
    if (!found && street && city) {
      return {
        ok: false,
        message: 'Delivery address must match a saved address or select one from your profile',
      };
    }
    return { ok: true };
  } catch (err) {
    console.warn('Address validation skipped:', err.message);
    return { ok: true, warning: 'Could not verify address with user service' };
  }
}

module.exports = {
  getUserById,
  getCustomerForNotification,
  validateUserAddress,
};
