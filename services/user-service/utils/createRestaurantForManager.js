/**
 * Creates a restaurant in restaurant_management DB when HTTP call to restaurant-service fails.
 * Uses the same MongoDB cluster (from MONGO_URI) with restaurant_management database.
 */
const mongoose = require('mongoose');

let RestaurantModel = null;

function getRestaurantModel() {
  if (RestaurantModel) return RestaurantModel;
  const restaurantDb = mongoose.connection.useDb('restaurant_management');
  const schema = new mongoose.Schema({
    name: { type: String, required: true },
    managerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    location: { address: { type: String, required: true }, city: String },
    contactInfo: { phone: { type: String, required: true }, email: String },
    cuisineType: { type: String, default: 'General' },
    deliveryRadius: { type: Number, default: 10 },
    openingHours: { open: String, close: String },
  }, { timestamps: true, strict: false });
  RestaurantModel = restaurantDb.model('Restaurant', schema);
  return RestaurantModel;
}

async function createRestaurantForManager({ managerId, name, address, contactNumber, email }) {
  const Restaurant = getRestaurantModel();
  const existing = await Restaurant.findOne({ managerId });
  if (existing) return existing;

  const restaurant = await Restaurant.create({
    name: name || 'My Restaurant',
    managerId,
    location: { address: (address || '').trim() || 'Address to be updated', city: '' },
    contactInfo: { phone: (contactNumber || '').trim() || '0000000000', email: email || '' },
    cuisineType: 'General',
    deliveryRadius: 10,
    openingHours: { open: '09:00', close: '22:00' },
  });
  return restaurant;
}

module.exports = { createRestaurantForManager };
