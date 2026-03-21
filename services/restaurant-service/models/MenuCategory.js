const mongoose = require('mongoose');

const menuCategorySchema = new mongoose.Schema({
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  name: { type: String, required: true },
  description: { type: String },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

menuCategorySchema.index({ restaurantId: 1 });

module.exports = mongoose.model('MenuCategory', menuCategorySchema);
