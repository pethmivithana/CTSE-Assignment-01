const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/create-intent', paymentController.createIntent);
router.post('/create', paymentController.createSimulated);
router.post('/cod', paymentController.createCod);
router.post('/verify', paymentController.verify);

router.get('/wallet/balance', paymentController.walletBalance);
router.post('/wallet/topup', paymentController.walletTopup);
router.post('/wallet/pay', paymentController.walletPay);

router.post('/paypal/create-order', paymentController.paypalCreate);
router.post('/paypal/capture', paymentController.paypalCapture);

router.get('/history/me', paymentController.history);
router.get('/receipt/:paymentId', paymentController.receipt);

router.post('/:id/refund', paymentController.refund);
router.get('/:id', paymentController.getById);

module.exports = router;
