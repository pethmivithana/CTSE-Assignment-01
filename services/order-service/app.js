// order-service/server.js

const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const Order = require("./models/Order");
const deliveryService = require("./services/deliveryService");

// Load environment variables
dotenv.config();

const app = express();

// Middlewares - CORS allow frontend (localhost:3000) and API gateway
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001'], credentials: true }));
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.error("⚠️ MongoDB connection error:", err));

// Routes
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/coupons", require("./routes/couponRoutes"));

// Recovery loop: ensure READY orders always have a delivery created/linked.
// This covers temporary downstream failures without requiring manual status toggles.
let isRecoveryRunning = false;
setInterval(async () => {
    if (isRecoveryRunning) return;
    if (mongoose.connection.readyState !== 1) return;
    isRecoveryRunning = true;
    try {
        const stuckReadyOrders = await Order.find({
            status: "READY",
            $or: [{ deliveryId: null }, { deliveryId: { $exists: false } }],
        })
            .sort({ createdAt: 1 })
            .limit(10);

        for (const order of stuckReadyOrders) {
            try {
                const delivery = await deliveryService.requestDriverAssignment(order);
                if (delivery?.delivery?.id) {
                    order.deliveryId = delivery.delivery.id;
                    await order.save();
                }
            } catch (err) {
                console.warn("READY recovery dispatch failed:", err.message);
            }
        }
    } catch (err) {
        console.warn("READY recovery loop failed:", err.message);
    } finally {
        isRecoveryRunning = false;
    }
}, 30000);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error("Server Error:", err);
    res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Not found middleware
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

// Check for MongoDB connection errors
mongoose.connection.on("error", (err) => {
    console.error("⚠️ MongoDB Error:", err);
});

// Start server
const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
    console.log(`🚀 Order Service running on port ${PORT}`);
});

module.exports = app; // Export app instance for testing