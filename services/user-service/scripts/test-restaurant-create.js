/**
 * Test script: Verify restaurant-service create-for-manager endpoint.
 * Run: node scripts/test-restaurant-create.js
 * Ensure restaurant-service is running on 3002 first.
 */
const axios = require('axios');

const RESTAURANT_SERVICE_URL = process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3002';
const url = `${RESTAURANT_SERVICE_URL}/api/restaurants/internal/create-for-manager`;

async function test() {
  console.log('Testing restaurant creation endpoint:', url);
  try {
    const { data, status } = await axios.post(url, {
      managerId: '507f1f77bcf86cd799439011',
      name: 'Test Restaurant',
      address: '123 Test St',
      contactNumber: '0771234567',
      email: 'test@test.com'
    }, { headers: { 'Content-Type': 'application/json' }, timeout: 5000 });
    console.log('SUCCESS - Status:', status, 'Restaurant:', data?._id);
  } catch (err) {
    console.error('FAILED:', err.code || err.message);
    if (err.response) console.error('  Status:', err.response.status, 'Data:', err.response.data);
  }
}
test();
