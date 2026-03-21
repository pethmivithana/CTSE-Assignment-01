const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

router.post('/', upload.single('image'), menuController.createMenuItem);
router.get('/', menuController.getMenuItems);
router.get('/:id', menuController.getMenuItem);
router.put('/:id', upload.single('image'), menuController.updateMenuItem);
router.delete('/:id', menuController.deleteMenuItem);
router.patch('/:id/stock', menuController.updateStock);

module.exports = router;
