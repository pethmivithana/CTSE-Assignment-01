#!/usr/bin/env node
/**
 * Seed script - creates one admin user if none exists.
 * Run: node scripts/seed-admin.js (from user-service directory)
 * With Docker: docker compose exec user-service npm run seed:admin
 *
 * Uses env vars (or defaults for local dev):
 *   ADMIN_EMAIL    - admin email
 *   ADMIN_PASSWORD - admin password
 *   ADMIN_NAME     - admin full name
 *   ADMIN_PHONE    - admin contact
 *   MONGO_URI      - MongoDB connection (must include DB name: user_management)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/UserModel');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'thakshilafonseka2002@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'thakshila123';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Thakshila Fonseka';
const ADMIN_PHONE = process.env.ADMIN_PHONE || '0771445776';

async function seedAdmin() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/user_management';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const existingAdmin = await User.findOne({ role: 'admin' });
  if (existingAdmin) {
    console.log('Admin user already exists:', existingAdmin.email);
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const admin = await User.create({
    fullName: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: hashedPassword,
    contactNumber: ADMIN_PHONE,
    role: 'admin',
    isApproved: true,
    isVerified: true,
  });

  console.log('Admin user created successfully');
  console.log('  Email:', admin.email);
  console.log('  Name:', admin.fullName);
  console.log('\nYou can now log in with the credentials above.');
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
