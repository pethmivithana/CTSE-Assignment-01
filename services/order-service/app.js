// order-service/server.js

const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

// Load environment variables
dotenv.config();

const app = express();

// Middlewares - CORS allow frontend (localhost:3000) and API gateway
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:5001'], credentials: true }));
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.error("⚠️ MongoDB connection error:", err));

// Routes
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/coupons", require("./routes/couponRoutes"));

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