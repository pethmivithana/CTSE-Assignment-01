const User = require("../models/UserModel");

exports.addSavedRestaurant = async (req, res) => {
  try {
    const { restaurantId, name } = req.body;
    if (!restaurantId) {
      return res.status(400).json({ status: false, message: "Restaurant ID is required" });
    }
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ status: false, message: "User not found" });
    const exists = user.savedRestaurants?.some((r) => String(r.restaurantId) === String(restaurantId));
    if (exists) {
      return res.status(400).json({ status: false, message: "Restaurant already saved" });
    }
    if (!user.savedRestaurants) user.savedRestaurants = [];
    user.savedRestaurants.push({ restaurantId, name: name || "Restaurant" });
    await user.save();
    res.status(201).json({
      status: true,
      message: "Restaurant saved",
      savedRestaurants: user.savedRestaurants,
    });
  } catch (error) {
    console.error("Add saved restaurant error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.removeSavedRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ status: false, message: "User not found" });
    user.savedRestaurants = user.savedRestaurants?.filter(
      (r) => String(r.restaurantId) !== String(restaurantId)
    ) || [];
    await user.save();
    res.status(200).json({
      status: true,
      message: "Restaurant removed from saved",
      savedRestaurants: user.savedRestaurants,
    });
  } catch (error) {
    console.error("Remove saved restaurant error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.getSavedRestaurants = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("savedRestaurants").lean();
    if (!user) return res.status(404).json({ status: false, message: "User not found" });
    res.status(200).json({
      status: true,
      savedRestaurants: user.savedRestaurants || [],
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.addFavoriteFood = async (req, res) => {
  try {
    const { menuItemId, name } = req.body;
    if (!menuItemId) {
      return res.status(400).json({ status: false, message: "Menu item ID is required" });
    }
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ status: false, message: "User not found" });
    const exists = user.favoriteFoods?.some((f) => String(f.menuItemId) === String(menuItemId));
    if (exists) {
      return res.status(400).json({ status: false, message: "Food already in favorites" });
    }
    if (!user.favoriteFoods) user.favoriteFoods = [];
    user.favoriteFoods.push({ menuItemId, name: name || "Food" });
    await user.save();
    res.status(201).json({
      status: true,
      message: "Added to favorites",
      favoriteFoods: user.favoriteFoods,
    });
  } catch (error) {
    console.error("Add favorite food error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.removeFavoriteFood = async (req, res) => {
  try {
    const { menuItemId } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ status: false, message: "User not found" });
    user.favoriteFoods = user.favoriteFoods?.filter(
      (f) => String(f.menuItemId) !== String(menuItemId)
    ) || [];
    await user.save();
    res.status(200).json({
      status: true,
      message: "Removed from favorites",
      favoriteFoods: user.favoriteFoods,
    });
  } catch (error) {
    console.error("Remove favorite food error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.getFavoriteFoods = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("favoriteFoods").lean();
    if (!user) return res.status(404).json({ status: false, message: "User not found" });
    res.status(200).json({
      status: true,
      favoriteFoods: user.favoriteFoods || [],
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.updateDietaryPreferences = async (req, res) => {
  try {
    const {
      vegetarian,
      vegan,
      glutenFree,
      halal,
      kosher,
      allergies,
    } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ status: false, message: "User not found" });
    if (!user.dietaryPreferences) user.dietaryPreferences = {};
    if (typeof vegetarian === "boolean") user.dietaryPreferences.vegetarian = vegetarian;
    if (typeof vegan === "boolean") user.dietaryPreferences.vegan = vegan;
    if (typeof glutenFree === "boolean") user.dietaryPreferences.glutenFree = glutenFree;
    if (typeof halal === "boolean") user.dietaryPreferences.halal = halal;
    if (typeof kosher === "boolean") user.dietaryPreferences.kosher = kosher;
    if (Array.isArray(allergies)) user.dietaryPreferences.allergies = allergies;
    await user.save();
    res.status(200).json({
      status: true,
      message: "Dietary preferences updated",
      dietaryPreferences: user.dietaryPreferences,
    });
  } catch (error) {
    console.error("Update dietary preferences error:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};

exports.getDietaryPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("dietaryPreferences").lean();
    if (!user) return res.status(404).json({ status: false, message: "User not found" });
    res.status(200).json({
      status: true,
      dietaryPreferences: user.dietaryPreferences || {},
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};
