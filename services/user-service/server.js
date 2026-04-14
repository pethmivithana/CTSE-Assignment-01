const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

// Load environment variables
dotenv.config();

const app = express();

// Middlewares - CORS allow frontend (localhost:3000) and API gateway (localhost:5001)
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:5001'], credentials: true }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
   
})
    .then(async () => {
      console.log("✅ MongoDB connected");
      // Ensure at least one admin exists on startup
      try {
        const User = require("./models/UserModel");
        const bcrypt = require("bcryptjs");
        const existingAdmin = await User.findOne({ role: "admin" });
        if (!existingAdmin) {
          const adminEmail = process.env.ADMIN_EMAIL || "admin@feedo.com";
          const adminPass = process.env.ADMIN_PASSWORD || "admin123";
          const admin = await User.create({
            fullName: process.env.ADMIN_NAME || "Admin",
            email: adminEmail,
            password: await bcrypt.hash(adminPass, 10),
            contactNumber: process.env.ADMIN_PHONE || "0000000000",
            role: "admin",
            isApproved: true,
            isVerified: true,
          });
          console.log("👤 Admin user created:", admin.email);
        }
      } catch (err) {
        console.warn("Could not seed admin:", err.message);
      }
    })
    .catch((err) => console.error("⚠️ MongoDB connection error:", err));

require("./config/passport");

// Routes (profile before /users so /users/profile/* is matched first)
app.use("/auth", require("./routes/authRoutes"));
app.use("/auth/verify", require("./routes/verificationRoutes"));
app.use("/users/profile", require("./routes/profileRoutes"));
app.use("/users", require("./routes/userRoute"));
app.use("/users/activity", require("./routes/activityRoutes"));

// Check for MongoDB connection errors
mongoose.connection.on("error", (err) => {
    console.error("⚠️ MongoDB Error:", err);
});

// Start server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app; // Export app instance for testing
