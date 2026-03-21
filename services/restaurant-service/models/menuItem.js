const mongoose = require('mongoose');

const priceSchema = new mongoose.Schema({
  small: { type: Number },
  medium: { type: Number },
  large: { type: Number }
}, { _id: false });

const menuItemSchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  restaurantName: { type: String, required: true },
  foodName: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuCategory' },
  imageUrl: { type: String },
  prices: priceSchema,
  price: { type: Number },
  isAvailable: { type: Boolean, default: true },
  isOutOfStock: { type: Boolean, default: false },
  stockQuantity: { type: Number, default: null },
  isVeg: { type: Boolean, default: true }
}, { timestamps: true });

menuItemSchema.index({ restaurantId: 1 });
menuItemSchema.index({ category: 1 });
menuItemSchema.index({ isVeg: 1 });
menuItemSchema.index({ isAvailable: 1, isOutOfStock: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);
