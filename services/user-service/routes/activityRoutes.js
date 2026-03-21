const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  getOrderHistory,
  addOrderToHistory,
  getSavedRestaurants,
  saveRestaurant,
  unsaveRestaurant,
} = require("../controllers/activityController");

const router = express.Router();

router.get("/orders", authMiddleware, getOrderHistory);
router.post("/orders", addOrderToHistory); // Called by Order Service (no auth)

router.get("/saved-restaurants", authMiddleware, getSavedRestaurants);
router.post("/saved-restaurants", authMiddleware, saveRestaurant);
router.delete("/saved-restaurants/:restaurantId", authMiddleware, unsaveRestaurant);

module.exports = router;
