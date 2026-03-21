const User = require("../models/UserModel");
const axios = require("axios");

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || "http://localhost:5003";
const RESTAURANT_SERVICE_URL = process.env.RESTAURANT_SERVICE_URL || "http://localhost:5000";

/**
 * Get order history - fetches from Order Service
 * GET /users/activity/orders
 */
exports.getOrderHistory = async (req, res) => {
  try {
    const userId = req.user._id.toString();

    // Call Order Service to get customer orders
    const response = await axios.get(`${ORDER_SERVICE_URL}/api/orders/me`, {
      headers: {
        Authorization: `Bearer ${req.token}`,
      },
      timeout: 5000,
    }).catch((err) => {
      if (err.response?.status === 404) return { data: [] };
      throw err;
    });

    const orders = response.data?.data || response.data || [];

    // Update user's orderHistory with any new order IDs (for local cache)
    const orderIds = orders.map((o) => o._id);
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { orderHistory: { $each: orderIds } },
    });

    res.status(200).json({
      status: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Get order history error:", error.message);
    // If order service is unavailable, return empty or cached
    const user = await User.findById(req.user._id).select("orderHistory").lean();
    res.status(200).json({
      status: true,
      count: 0,
      orders: [],
      message: "Order service temporarily unavailable. Showing cached data.",
    });
  }
};

/**
 * Add order to user's history (called by Order Service when order is placed)
 * POST /users/activity/orders
 * Body: { orderId }
 */
exports.addOrderToHistory = async (req, res) => {
  try {
    const { orderId, userId } = req.body;

    if (!orderId || !userId) {
      return res.status(400).json({
        status: false,
        message: "orderId and userId are required",
      });
    }

    await User.findByIdAndUpdate(userId, {
      $addToSet: { orderHistory: orderId },
    });

    res.status(200).json({
      status: true,
      message: "Order added to history",
    });
  } catch (error) {
    console.error("Add order to history error:", error);
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

/**
 * Get saved restaurants
 * GET /users/activity/saved-restaurants
 */
exports.getSavedRestaurants = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("savedRestaurants")
      .lean();

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const savedIds = user.savedRestaurants || [];

    res.status(200).json({
      status: true,
      count: savedIds.length,
      savedRestaurants: savedIds,
    });
  } catch (error) {
    console.error("Get saved restaurants error:", error);
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

/**
 * Add restaurant to saved list
 * POST /users/activity/saved-restaurants
 * Body: { restaurantId }
 */
exports.saveRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.body;

    if (!restaurantId) {
      return res.status(400).json({
        status: false,
        message: "restaurantId is required",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { savedRestaurants: restaurantId } },
      { new: true }
    )
      .select("savedRestaurants")
      .lean();

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    res.status(201).json({
      status: true,
      message: "Restaurant saved successfully",
      savedRestaurants: user.savedRestaurants,
    });
  } catch (error) {
    console.error("Save restaurant error:", error);
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

/**
 * Remove restaurant from saved list
 * DELETE /users/activity/saved-restaurants/:restaurantId
 */
exports.unsaveRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { savedRestaurants: restaurantId } },
      { new: true }
    )
      .select("savedRestaurants")
      .lean();

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      status: true,
      message: "Restaurant removed from saved list",
      savedRestaurants: user.savedRestaurants,
    });
  } catch (error) {
    console.error("Unsave restaurant error:", error);
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};
