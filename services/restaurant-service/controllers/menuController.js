const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');

exports.createMenuItem = async (req, res) => {
  try {
    const {
      restaurantId,
      restaurantName,
      foodName,
      description,
      category,
      categoryId,
      prices,
      price,
      isAvailable,
      isOutOfStock,
      isVeg,
      stockQuantity,
    } = req.body;
    const imageUrl = req.file ? req.file.filename : '';

    const itemData = {
      restaurantId: restaurantId && mongoose.Types.ObjectId.isValid(restaurantId) ? new mongoose.Types.ObjectId(restaurantId) : restaurantId,
      restaurantName,
      foodName,
      description: description != null ? String(description) : '',
      category,
      imageUrl,
      isAvailable: isAvailable !== false,
      isOutOfStock: isOutOfStock === true,
      isVeg: isVeg !== false
    };
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) itemData.categoryId = new mongoose.Types.ObjectId(categoryId);
    if (prices) {
      try {
        itemData.prices = typeof prices === 'string' ? JSON.parse(prices) : prices;
      } catch (e) {
        return res.status(400).json({ error: 'Invalid prices JSON' });
      }
    }
    if (price !== undefined) itemData.price = Number(price);
    if (stockQuantity !== undefined && stockQuantity !== '' && stockQuantity !== null) itemData.stockQuantity = Number(stockQuantity);

    const newItem = new MenuItem(itemData);
    await newItem.save();
    res.status(201).json(newItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMenuItems = async (req, res) => {
  try {
    const { restaurantId, category, isVeg, cuisineType, available } = req.query;
    const query = {};
    if (restaurantId) {
      if (!mongoose.Types.ObjectId.isValid(restaurantId)) return res.json([]);
      query.restaurantId = new mongoose.Types.ObjectId(restaurantId);
    }
    if (category) query.category = category;
    if (isVeg !== undefined) query.isVeg = isVeg === 'true';
    if (available !== undefined) {
      if (available === 'true') {
        query.isAvailable = true;
        query.isOutOfStock = false;
      } else if (available === 'false') {
        query.$or = [{ isAvailable: false }, { isOutOfStock: true }];
      }
    }

    const items = await MenuItem.find(query);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Menu item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateMenuItem = async (req, res) => {
  try {
    const { restaurantId, restaurantName, foodName, description, category, categoryId, prices, price, isAvailable, isOutOfStock, isVeg, stockQuantity } = req.body;
    const imageUrl = req.file ? req.file.filename : undefined;

    const updatedFields = {};
    if (restaurantId && mongoose.Types.ObjectId.isValid(restaurantId)) updatedFields.restaurantId = new mongoose.Types.ObjectId(restaurantId);
    if (restaurantName !== undefined) updatedFields.restaurantName = restaurantName;
    if (foodName !== undefined) updatedFields.foodName = foodName;
    if (description !== undefined) updatedFields.description = description;
    if (category !== undefined) updatedFields.category = category;
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) updatedFields.categoryId = new mongoose.Types.ObjectId(categoryId);
    if (imageUrl) updatedFields.imageUrl = imageUrl;
    if (isAvailable !== undefined) updatedFields.isAvailable = isAvailable;
    if (isOutOfStock !== undefined) updatedFields.isOutOfStock = isOutOfStock;
    if (isVeg !== undefined) updatedFields.isVeg = isVeg;
    if (prices !== undefined) updatedFields.prices = typeof prices === 'string' ? JSON.parse(prices) : prices;
    if (price !== undefined) updatedFields.price = Number(price);

    const item = await MenuItem.findByIdAndUpdate(req.params.id, updatedFields, { new: true });
    if (!item) return res.status(404).json({ error: 'Menu item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Menu item not found' });
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateStock = async (req, res) => {
  try {
    const { isOutOfStock, stockQuantity } = req.body;
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Menu item not found' });
    if (typeof isOutOfStock === 'boolean') item.isOutOfStock = isOutOfStock;
    if (stockQuantity !== undefined) {
      item.stockQuantity = stockQuantity === '' || stockQuantity === null ? null : Number(stockQuantity);
      if (item.stockQuantity !== null && item.stockQuantity <= 0) item.isOutOfStock = true;
    }
    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
