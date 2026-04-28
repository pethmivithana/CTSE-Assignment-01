const express = require("express");
const axios = require("axios");
const User = require("../models/UserModel");
const bcrypt = require("bcryptjs");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");
const { sendApprovalNotification } = require("../utils/emailService");
const router = express.Router();

const RESTAURANT_SERVICE_URL = process.env.RESTAURANT_SERVICE_URL || "http://localhost:3002";
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || "http://localhost:3001";
const DELIVERY_SERVICE_URL = process.env.DELIVERY_SERVICE_URL || "http://localhost:3003";
const { createRestaurantForManager } = require("../utils/createRestaurantForManager");

// Helper: register driver in delivery service (used on approval and self-sync)
async function registerDriverWithDeliveryService(user) {
  const driverPayload = {
    userId: user._id.toString(),
    name: user.fullName || "Driver",
    email: user.email,
    phone: user.contactNumber || "0000000000",
    vehicleType: user.driverProfile?.vehicleType || "MOTORCYCLE",
    vehicleDetails: {
      model: user.driverProfile?.vehicleDetails?.model || "N/A",
      licensePlate: user.driverProfile?.vehicleDetails?.licensePlate || "N/A",
    },
  };
  const driverUrls = [`${DELIVERY_SERVICE_URL}/api/delivery/drivers/register`, `${API_GATEWAY_URL}/api/delivery/drivers/register`];
  for (const url of driverUrls) {
    try {
      await axios.post(url, driverPayload, { headers: { "Content-Type": "application/json" }, timeout: 8000 });
      return true;
    } catch (drvErr) {
      const status = drvErr.response?.status;
      // Driver already registered in delivery DB — treat as success
      if (status === 409) return true;
      console.warn(`Driver registration failed (${url}):`, drvErr.message, status ? `HTTP ${status}` : "");
    }
  }
  return false;
}

// CREATE (admin manually creating user)
router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { fullName, email, password, contactNumber, role, restaurantName, restaurantAddress } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "Email already in use" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const userData = {
            fullName,
            email,
            password: hashedPassword,
            contactNumber,
            role,
            isApproved: true // Admin-created users are approved directly
        };

        // Add restaurant information if role is restaurant manager
        if (role === "restaurantManager") {
            if (!restaurantName || !restaurantAddress) {
                return res.status(400).json({ 
                    error: "Restaurant name and address are required for restaurant managers" 
                });
            }
            
            userData.restaurantInfo = {
                name: restaurantName,
                address: restaurantAddress
            };
        }

        const user = new User(userData);
        await user.save();

        res.status(201).json({
            status: true,
            message: "User created successfully!",
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                contactNumber: user.contactNumber,
                role: user.role,
                restaurantInfo: user.restaurantInfo,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }
        });
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Internal: get user email by ID (for notifications - service-to-service, no auth)
router.get("/internal/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("email fullName");
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json({ email: user.email, fullName: user.fullName });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// READ all users (admin only)
router.get("/", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const users = await User.find().select("-password");
        res.status(200).json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Self-service: approved deliveryPerson can register/sync with delivery service (when initial approval failed)
router.post("/me/register-driver", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role !== "deliveryPerson") return res.status(403).json({ error: "Only delivery persons can use this" });
    if (!user.isApproved) return res.status(403).json({ error: "Your account must be approved by admin first" });
    const ok = await registerDriverWithDeliveryService(user);
    if (!ok) return res.status(502).json({ error: "Could not register with delivery service. Please try again or contact admin." });
    res.json({ status: true, message: "Driver profile synced successfully" });
  } catch (err) {
    console.error("register-driver error:", err);
    res.status(500).json({ error: err.message });
  }
});

// In user service routes
router.get('/pending', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const pendingUsers = await User.find({ 
        isApproved: false,
        role: { $ne: 'customer' } 
      }).select('-password');
      res.json(pendingUsers);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  router.put('/:id/create-restaurant', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select('-password');
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (user.role !== 'restaurantManager') return res.status(400).json({ error: 'User is not a restaurant manager' });
      let restaurant = null;
      const payload = {
        managerId: user._id.toString(),
        name: user.restaurantInfo?.name || (user.fullName ? `${user.fullName}'s Restaurant` : 'My Restaurant'),
        address: user.restaurantInfo?.address || 'Address to be updated',
        contactNumber: user.contactNumber || '',
        email: user.email
      };
      const urlsToTry = [
        `${RESTAURANT_SERVICE_URL}/api/restaurants/internal/create-for-manager`,
        `${API_GATEWAY_URL}/api/restaurants/internal/create-for-manager`
      ];
      for (const url of urlsToTry) {
        try {
          const { data } = await axios.post(url, payload, { headers: { 'Content-Type': 'application/json' }, timeout: 5000 });
          restaurant = data;
          break;
        } catch (_) {}
      }
      if (!restaurant) restaurant = await createRestaurantForManager({ managerId: user._id, ...payload });
      await User.findByIdAndUpdate(user._id, { $set: { 'restaurantInfo._id': restaurant._id } });
      res.json({ status: true, message: 'Restaurant created', restaurant });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/:id/approve', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { isApproved: true },
        { new: true }
      ).select('-password');
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.role === 'restaurantManager') {
        let restaurant = null;
        const payload = {
          managerId: user._id.toString(),
          name: user.restaurantInfo?.name || (user.fullName ? `${user.fullName}'s Restaurant` : 'My Restaurant'),
          address: user.restaurantInfo?.address || 'Address to be updated',
          contactNumber: user.contactNumber || '',
          email: user.email
        };
        const urlsToTry = [
          `${RESTAURANT_SERVICE_URL}/api/restaurants/internal/create-for-manager`,
          `${API_GATEWAY_URL}/api/restaurants/internal/create-for-manager`
        ];
        for (const url of urlsToTry) {
          try {
            const { data } = await axios.post(url, payload, {
              headers: { 'Content-Type': 'application/json' },
              timeout: 5000
            });
            restaurant = data;
            console.log('Restaurant created via HTTP:', user.email, restaurant._id);
            break;
          } catch (err) {
            console.warn(`Restaurant HTTP failed (${url}):`, err.message);
          }
        }
        if (!restaurant) {
          try {
            restaurant = await createRestaurantForManager({
              managerId: user._id,
              name: payload.name,
              address: payload.address,
              contactNumber: payload.contactNumber,
              email: payload.email
            });
            console.log('Restaurant created via DB fallback:', user.email, restaurant._id);
          } catch (dbErr) {
            console.error('Restaurant creation (DB fallback) failed:', dbErr.message);
          }
        }
        if (restaurant) {
          await User.findByIdAndUpdate(user._id, { $set: { 'restaurantInfo._id': restaurant._id } });
        }
      }

      if (user.role === 'deliveryPerson') {
        const ok = await registerDriverWithDeliveryService(user);
        if (ok) console.log('Driver registered for:', user.email);
      }

      if (user.role === 'restaurantManager' || user.role === 'deliveryPerson') {
        try {
          await sendApprovalNotification(
            user.email,
            user.fullName || 'User',
            user.role
          );
        } catch (emailErr) {
          console.warn('Approval email failed (user still approved):', emailErr.message);
        }
      }

      res.json({ 
        status: true,
        message: 'User approved successfully',
        user 
      });
    } catch (error) {
      console.error('Approval error:', error);
      res.status(500).json({ error: error.message });
    }
});

// UPDATE user (self or admin)
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const { fullName, email, password, contactNumber, role, restaurantName, restaurantAddress } = req.body;

        if (req.user.role !== "admin" && req.user._id.toString() !== req.params.id) {
            return res.status(403).json({ error: "You can only update your own profile" });
        }

        const updateFields = { fullName, email, contactNumber };
        if (req.user.role === "admin" && role) {
            updateFields.role = role;
        }

        if (password) {
            updateFields.password = await bcrypt.hash(password, 10);
        }

        // Update restaurant information if provided and role is restaurant manager (admin only)
        if (req.user.role === "admin" && role === "restaurantManager") {
            if (restaurantName || restaurantAddress) {
                updateFields.restaurantInfo = {};
                
                if (restaurantName) {
                    updateFields.restaurantInfo.name = restaurantName;
                }
                
                if (restaurantAddress) {
                    updateFields.restaurantInfo.address = restaurantAddress;
                }
            }
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            updateFields,
            { new: true }
        ).select("-password");

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json(updatedUser);
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// DELETE user (admin only)
router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get token
router.get('/token', authMiddleware, async (req, res) => {
    try {
      res.status(200).json({ token: req.token });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch token' });
    }
});

// Link restaurant to manager (after restaurant is created)
router.put('/me/link-restaurant', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'restaurantManager') {
      return res.status(403).json({ error: 'Only restaurant managers can link a restaurant' });
    }
    const { restaurantId } = req.body;
    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId is required' });
    }
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.restaurantInfo) user.restaurantInfo = {};
    user.restaurantInfo._id = restaurantId;
    await user.save({ validateBeforeSave: false });
    const { password: _, ...updated } = user.toObject();
    res.json({ status: true, user: updated });
  } catch (error) {
    console.error('Link restaurant error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user profile (for token verification)
router.get('/profile', authMiddleware, async (req, res) => {
    try {
      res.status(200).json({ 
        status: true,
        user: req.user 
      });
    } catch (error) {
      res.status(500).json({ 
        status: false,
        message: error.message 
      });
    }
});

module.exports = router;