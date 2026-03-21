const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  getFullProfile,
  updateProfile,
  changePassword,
  updateProfilePicture,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  updatePaymentPreferences,
  getSessions,
  revokeSession,
} = require("../controllers/profileController");
const {
  addSavedRestaurant,
  removeSavedRestaurant,
  getSavedRestaurants,
  addFavoriteFood,
  removeFavoriteFood,
  getFavoriteFoods,
  updateDietaryPreferences,
  getDietaryPreferences,
} = require("../controllers/preferencesController");
const { deactivateAccount } = require("../controllers/accountController");
const { uploadProfilePicture } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.use(authMiddleware);

// GET /users/profile - for token verification (used by restaurant/order services)
router.get("/", (req, res) => res.status(200).json({ status: true, user: req.user }));

router.get("/full", getFullProfile);
router.put("/", updateProfile);
router.put("/password", changePassword);
router.put("/picture", (req, res, next) => {
  if (req.headers["content-type"]?.includes("multipart/form-data")) {
    uploadProfilePicture(req, res, (err) => {
      if (err) return res.status(400).json({ status: false, message: err.message });
      next();
    });
  } else {
    next();
  }
}, updateProfilePicture);

router.get("/sessions", getSessions);
router.delete("/sessions/:sessionId", revokeSession);

router.post("/addresses", addAddress);
router.put("/addresses/:addressId", updateAddress);
router.delete("/addresses/:addressId", deleteAddress);
router.put("/addresses/:addressId/default", setDefaultAddress);

router.put("/payment-preferences", updatePaymentPreferences);

router.post("/saved-restaurants", addSavedRestaurant);
router.delete("/saved-restaurants/:restaurantId", removeSavedRestaurant);
router.get("/saved-restaurants", getSavedRestaurants);
router.post("/favorite-foods", addFavoriteFood);
router.delete("/favorite-foods/:menuItemId", removeFavoriteFood);
router.get("/favorite-foods", getFavoriteFoods);
router.put("/dietary-preferences", updateDietaryPreferences);
router.get("/dietary-preferences", getDietaryPreferences);

router.post("/deactivate", deactivateAccount);

module.exports = router;
