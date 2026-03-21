const Restaurant = require('../models/Restaurant');

// Internal: Create restaurant when admin approves manager (idempotent - returns existing if any)
exports.createForManager = async (req, res) => {
  try {
    const { managerId, name, address, contactNumber, email } = req.body;
    if (!managerId || !name) {
      return res.status(400).json({ error: 'managerId and name are required' });
    }
    const safeAddress = address && String(address).trim() ? address : 'Address to be updated';
    let restaurant = await Restaurant.findOne({ managerId });
    if (restaurant) return res.json(restaurant);
    restaurant = new Restaurant({
      name,
      managerId,
      location: { address: safeAddress, city: '' },
      contactInfo: { phone: contactNumber || '0000000000', email: email || '' },
      cuisineType: 'General',
      deliveryRadius: 10,
      openingHours: { open: '09:00', close: '22:00' }
    });
    await restaurant.save();
    res.status(201).json(restaurant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createRestaurant = async (req, res) => {
  try {
    const restaurant = new Restaurant(req.body);
    await restaurant.save();
    res.status(201).json(restaurant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRestaurants = async (req, res) => {
  try {
    const { cuisineType, isVeg, isOpen, deliveryAvailable, city, search, sort } = req.query;
    const query = {};
    if (cuisineType) query.cuisineType = cuisineType;
    if (isVeg !== undefined) query.isVeg = isVeg === 'true';
    if (isOpen !== undefined) query.isOpen = isOpen === 'true';
    if (deliveryAvailable !== undefined) query.deliveryAvailable = deliveryAvailable === 'true';
    if (city) query['location.city'] = new RegExp(city.trim(), 'i');
    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { name: new RegExp(s, 'i') },
        { cuisineType: new RegExp(s, 'i') },
        { description: new RegExp(s, 'i') },
        { 'location.address': new RegExp(s, 'i') },
        { 'location.city': new RegExp(s, 'i') },
      ];
    }

    let restaurants = await Restaurant.find(query).lean();
    if (sort === 'rating_desc') restaurants.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sort === 'rating_asc') restaurants.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    else if (sort === 'name_asc') restaurants.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    else if (sort === 'name_desc') restaurants.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    else restaurants.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    res.json(restaurants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    res.json(restaurant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    res.json(restaurant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    res.json({ message: 'Restaurant deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateAvailability = async (req, res) => {
  try {
    const { isOpen, deliveryAvailable } = req.body;
    const update = {};
    if (typeof isOpen === 'boolean') update.isOpen = isOpen;
    if (typeof deliveryAvailable === 'boolean') update.deliveryAvailable = deliveryAvailable;

    const restaurant = await Restaurant.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    res.json(restaurant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Check if restaurant can deliver to given location (lat, lng)
exports.checkDeliveryAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.query;

    const restaurant = await Restaurant.findById(id);
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    if (!restaurant.isOpen || !restaurant.deliveryAvailable) {
      return res.json({ available: false, reason: 'Restaurant is closed or delivery not available' });
    }

    if (!latitude || !longitude) {
      return res.json({ available: restaurant.deliveryAvailable, reason: 'No location provided - assuming available' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (!restaurant.location?.latitude || !restaurant.location?.longitude) {
      return res.json({ available: true, reason: 'Restaurant has no location - cannot verify zone' });
    }

    const distance = haversineDistance(
      restaurant.location.latitude,
      restaurant.location.longitude,
      lat,
      lng
    );

    const maxRadius = Math.max(
      ...(restaurant.deliveryZones || [{ radius: 10 }]).map(z => z.radius),
      10
    );

    const available = distance <= maxRadius;
    res.json({
      available,
      distance: Math.round(distance * 100) / 100,
      maxRadius,
      reason: available ? 'Within delivery zone' : `Address is ${Math.round(distance - maxRadius)}km outside delivery zone`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
