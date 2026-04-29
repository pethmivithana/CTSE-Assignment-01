const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/menuItem');
const MenuCategory = require('../models/MenuCategory');
const axios = require('axios');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:5002';
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3001';

const getAuthHeaders = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

exports.getOrCreateMyRestaurant = async (req, res) => {
  try {
    const managerId = req.user._id;
    let restaurant = await Restaurant.findOne({ managerId });
    if (!restaurant) {
      const name = req.user.restaurantInfo?.name || req.user.fullName ? `${req.user.fullName}'s Restaurant` : 'My Restaurant';
      const address = (req.user.restaurantInfo?.address || '').trim() || 'Address to be updated';
      const phone = (req.user.contactNumber || '').trim() || '0000000000';
      restaurant = new Restaurant({
        name,
        description: '',
        managerId,
        location: { address, city: '' },
        contactInfo: { phone, email: req.user.email || '' },
        cuisineType: 'General',
        deliveryRadius: 10,
        openingHours: { open: '09:00', close: '22:00' }
      });
      await restaurant.save();
      try {
        await axios.put(
          `${USER_SERVICE_URL}/users/me/link-restaurant`,
          { restaurantId: restaurant._id },
          { headers: getAuthHeaders(req.token) }
        );
      } catch (linkErr) {
        console.warn('Could not link restaurant to user:', linkErr.message);
      }
    }
    res.json(restaurant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateMyRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ managerId: req.user._id });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    const {
      name, logo, description, deliveryRadius, cuisineType, isOpen, deliveryAvailable,
      location, contactInfo, openingHours
    } = req.body;
    if (name !== undefined) restaurant.name = name;
    if (logo !== undefined) restaurant.logo = logo;
    if (description !== undefined) restaurant.description = description;
    if (deliveryRadius !== undefined) restaurant.deliveryRadius = Number(deliveryRadius);
    if (cuisineType !== undefined) restaurant.cuisineType = cuisineType;
    if (typeof isOpen === 'boolean') restaurant.isOpen = isOpen;
    if (typeof deliveryAvailable === 'boolean') restaurant.deliveryAvailable = deliveryAvailable;
    if (location) Object.assign(restaurant.location, location);
    if (contactInfo) Object.assign(restaurant.contactInfo, contactInfo);
    if (openingHours) Object.assign(restaurant.openingHours, openingHours);
    await restaurant.save();
    res.json(restaurant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateMyRestaurantAvailability = async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ managerId: req.user._id });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    const { isOpen } = req.body;
    if (typeof isOpen === 'boolean') restaurant.isOpen = isOpen;
    await restaurant.save();
    res.json(restaurant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ managerId: req.user._id });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3004';
    const { data } = await axios.get(`${ORDER_SERVICE_URL}/api/orders/restaurant/analytics`, {
      headers: getAuthHeaders(req.token)
    }).catch(() => ({ data: null }));
    if (data) return res.json(data);
    res.json({
      dailyRevenue: 0,
      weeklyRevenue: 0,
      dailyOrders: 0,
      weeklyOrders: 0,
      popularItems: [],
      totalOrders: 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
