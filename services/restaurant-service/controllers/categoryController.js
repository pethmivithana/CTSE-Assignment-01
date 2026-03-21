const mongoose = require('mongoose');
const MenuCategory = require('../models/MenuCategory');

exports.createCategory = async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.restaurantId && mongoose.Types.ObjectId.isValid(data.restaurantId)) data.restaurantId = new mongoose.Types.ObjectId(data.restaurantId);
    const category = new MenuCategory(data);
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const { restaurantId } = req.query;
    let query = {};
    if (restaurantId) {
      if (!mongoose.Types.ObjectId.isValid(restaurantId)) return res.json([]);
      query.restaurantId = new mongoose.Types.ObjectId(restaurantId);
    }
    const categories = await MenuCategory.find(query).sort({ sortOrder: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCategory = async (req, res) => {
  try {
    const category = await MenuCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.restaurantId && mongoose.Types.ObjectId.isValid(data.restaurantId)) data.restaurantId = new mongoose.Types.ObjectId(data.restaurantId);
    const category = await MenuCategory.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await MenuCategory.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
