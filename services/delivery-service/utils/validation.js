// File: utils/validation.js
const Joi = require('joi');

// Validate delivery data
exports.validateDeliveryData = (data) => {
  const schema = Joi.object({
    orderId: Joi.string().required(),
    restaurantId: Joi.string().required(),
    customerId: Joi.string().required(),
    orderDetails: Joi.object({
      items: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          quantity: Joi.number().integer().min(1).required(),
          price: Joi.number().min(0).required()
        })
      ).required(),
      totalAmount: Joi.number().min(0).required()
    }).required(),
    paymentMethod: Joi.string().valid('CREDIT_CARD', 'DEBIT_CARD', 'CASH_ON_DELIVERY', 'ONLINE_PAYMENT'),
    paymentStatus: Joi.string().valid('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'),
    codAmountDue: Joi.number().min(0),
    pickupLocation: Joi.object({
      address: Joi.string().required(),
      latitude: Joi.number().required(),
      longitude: Joi.number().required()
    }).required(),
    dropoffLocation: Joi.object({
      address: Joi.string().required(),
      latitude: Joi.number().required(),
      longitude: Joi.number().required()
    }).required(),
    deliveryNotes: Joi.string().allow(''),
    deliveryFee: Joi.number().min(0)
  });
  
  return schema.validate(data);
};

// Validate driver data
exports.validateDriverData = (data) => {
  const schema = Joi.object({
    userId: Joi.string().required(),
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    phone: Joi.string().required(),
    isVerified: Joi.boolean(),
    vehicleType: Joi.string().valid('BICYCLE', 'MOTORCYCLE', 'CAR', 'VAN').default('MOTORCYCLE'),
    vehicleDetails: Joi.object({
      model: Joi.string().allow('').default('N/A'),
      licensePlate: Joi.string().allow('').default('N/A')
    }).default({ model: 'N/A', licensePlate: 'N/A' })
  });
  
  return schema.validate(data);
};