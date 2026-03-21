const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');
const restaurantManagerController = require('../controllers/restaurantManagerController');
const reviewController = require('../controllers/reviewController');
const { authMiddleware, restaurantManagerMiddleware, customerMiddleware } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/', restaurantController.createRestaurant);
router.post('/internal/create-for-manager', restaurantController.createForManager);
router.get('/', restaurantController.getRestaurants);

router.get('/my-restaurant', authMiddleware, restaurantManagerMiddleware, restaurantManagerController.getOrCreateMyRestaurant);
router.post('/my-restaurant/create', authMiddleware, restaurantManagerMiddleware, restaurantManagerController.getOrCreateMyRestaurant);
router.put('/my-restaurant', authMiddleware, restaurantManagerMiddleware, restaurantManagerController.updateMyRestaurant);
router.patch('/my-restaurant/availability', authMiddleware, restaurantManagerMiddleware, restaurantManagerController.updateMyRestaurantAvailability);
router.put('/my-restaurant/logo', authMiddleware, restaurantManagerMiddleware, upload.single('logo'), async (req, res) => {
  try {
    const Restaurant = require('../models/Restaurant');
    const restaurant = await Restaurant.findOne({ managerId: req.user._id });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    if (req.file) restaurant.logo = req.file.filename;
    await restaurant.save();
    res.json(restaurant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get('/my-restaurant/analytics', authMiddleware, restaurantManagerMiddleware, restaurantManagerController.getAnalytics);

router.get('/:id/reviews', reviewController.getRestaurantReviews);
router.post('/:id/reviews', authMiddleware, customerMiddleware, reviewController.createOrUpdateReview);
router.get('/:id', restaurantController.getRestaurant);
router.put('/:id', restaurantController.updateRestaurant);
router.delete('/:id', restaurantController.deleteRestaurant);
router.patch('/:id/availability', restaurantController.updateAvailability);
router.get('/:id/delivery-check', restaurantController.checkDeliveryAvailability);

module.exports = router;
