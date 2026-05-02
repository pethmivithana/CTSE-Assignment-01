#!/usr/bin/env node
/**
 * Seed a restaurant + categories + menu items on a deployed Feedo stack (via API gateway).
 *
 * Usage:
 *   set SEED_API_URL=https://api-gateway-....azurecontainerapps.io
 *   set SEED_EMAIL=your-restaurant-manager@email.com
 *   set SEED_PASSWORD=your-password
 *   node scripts/seed-deployed-restaurant.mjs
 *
 * Or: node scripts/seed-deployed-restaurant.mjs <API_URL> <email> <password>
 *
 * Requires an approved restaurantManager account (same as logging into the dashboard).
 */

const args = process.argv.slice(2);
const API_URL = (process.env.SEED_API_URL || args[0] || '').replace(/\/$/, '');
const email = process.env.SEED_EMAIL || args[1] || '';
const password = process.env.SEED_PASSWORD || args[2] || '';

if (!API_URL || !email || !password) {
  console.error(`
Missing configuration.

  Windows (PowerShell):
    $env:SEED_API_URL="https://YOUR-api-gateway....azurecontainerapps.io"
    $env:SEED_EMAIL="you@example.com"
    $env:SEED_PASSWORD="your-password"
    node scripts/seed-deployed-restaurant.mjs

  Or one line:
    node scripts/seed-deployed-restaurant.mjs "https://api-gateway-....io" "you@example.com" "your-password"
`);
  process.exit(1);
}

const categoriesSeed = [
  { name: 'Mains', description: 'Signature dishes' },
  { name: 'Sides', description: 'Sides & extras' },
  { name: 'Beverages', description: 'Drinks' },
];

const itemsSeed = [
  { category: 'Mains', foodName: 'Chicken Rice Bowl', description: 'Grilled chicken with rice and salad', prices: { small: 650, medium: 890, large: 1150 } },
  { category: 'Mains', foodName: 'Vegetable Curry', description: 'Mixed veg curry with rice', prices: { small: 450, medium: 620, large: 850 } },
  { category: 'Sides', foodName: 'Garlic Bread', description: 'Toasted with garlic butter', prices: { small: 280, medium: 380 } },
  { category: 'Beverages', foodName: 'Iced Tea', description: 'House blend', prices: { medium: 220 } },
];

async function main() {
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginBody = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok) {
    console.error('Login failed:', loginRes.status, loginBody.message || loginBody);
    process.exit(1);
  }
  const token = loginBody.token;
  if (!token) {
    console.error('Login response had no token:', loginBody);
    process.exit(1);
  }
  const user = loginBody.user || {};
  if (user.role && user.role !== 'restaurantManager') {
    console.error(`User role is "${user.role}" — need restaurantManager.`);
    process.exit(1);
  }

  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  let restRes = await fetch(`${API_URL}/api/restaurants/my-restaurant`, { headers: auth });
  let restaurant = await restRes.json().catch(() => ({}));
  if (!restRes.ok) {
    console.error('GET my-restaurant failed:', restRes.status, restaurant);
    process.exit(1);
  }

  if (!restaurant || !restaurant._id) {
    const createRes = await fetch(`${API_URL}/api/restaurants/my-restaurant/create`, {
      method: 'POST',
      headers: auth,
    });
    restaurant = await createRes.json().catch(() => ({}));
    if (!createRes.ok || !restaurant._id) {
      console.error('Create restaurant failed:', createRes.status, restaurant);
      process.exit(1);
    }
  }

  const rid = restaurant._id;
  const rname = restaurant.name || "Demo Restaurant";

  const patchRes = await fetch(`${API_URL}/api/restaurants/my-restaurant`, {
    method: 'PUT',
    headers: auth,
    body: JSON.stringify({
      name: rname.includes('Restaurant') ? rname : `${rname} (Demo menu)`,
      description: restaurant.description || 'Seeded demo menu from scripts/seed-deployed-restaurant.mjs',
      cuisineType: restaurant.cuisineType || 'General',
      deliveryRadius: restaurant.deliveryRadius || 10,
      location: {
        address: restaurant.location?.address || '123 Demo Street',
        city: restaurant.location?.city || 'Colombo',
      },
      contactInfo: {
        phone: restaurant.contactInfo?.phone || '0770000000',
        email: restaurant.contactInfo?.email || email,
      },
      openingHours: restaurant.openingHours || { open: '09:00', close: '22:00' },
    }),
  });
  if (!patchRes.ok) {
    const err = await patchRes.json().catch(() => ({}));
    console.warn('Profile update skipped:', patchRes.status, err);
  } else {
    restaurant = await patchRes.json();
  }

  const existingCatRes = await fetch(`${API_URL}/api/categories?restaurantId=${rid}`);
  const existingCats = existingCatRes.ok ? await existingCatRes.json().catch(() => []) : [];
  const existingCatByName = Object.fromEntries((existingCats || []).map((x) => [x.name, x]));

  const createdCategories = [];
  for (const c of categoriesSeed) {
    if (existingCatByName[c.name]) {
      createdCategories.push(existingCatByName[c.name]);
      console.log('Category (already exists):', c.name, existingCatByName[c.name]._id);
      continue;
    }
    const cr = await fetch(`${API_URL}/api/categories`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        restaurantId: rid,
        name: c.name,
        description: c.description,
        sortOrder: createdCategories.length,
      }),
    });
    const body = await cr.json().catch(() => ({}));
    if (!cr.ok) {
      console.error('Category failed:', c.name, cr.status, body);
      process.exit(1);
    }
    createdCategories.push(body);
    existingCatByName[c.name] = body;
    console.log('Category:', body.name, body._id);
  }

  const catByName = { ...existingCatByName, ...Object.fromEntries(createdCategories.map((x) => [x.name, x])) };

  const itemsRes = await fetch(`${API_URL}/api/menu-items?restaurantId=${rid}`);
  const existingItems = itemsRes.ok ? await itemsRes.json().catch(() => []) : [];
  const existingFoodNames = new Set((existingItems || []).map((x) => x.foodName));

  for (const item of itemsSeed) {
    if (existingFoodNames.has(item.foodName)) {
      console.log('Menu item (already exists):', item.foodName);
      continue;
    }
    const cat = catByName[item.category];
    const prices = item.prices;
    const base = Math.min(...Object.values(prices).filter((n) => typeof n === 'number'));

    const fd = new FormData();
    fd.append('restaurantId', rid);
    fd.append('restaurantName', restaurant.name || rname);
    fd.append('foodName', item.foodName);
    fd.append('description', item.description || '');
    fd.append('category', item.category);
    if (cat?._id) fd.append('categoryId', cat._id);
    fd.append('prices', JSON.stringify(prices));
    fd.append('price', String(base));
    fd.append('isAvailable', 'true');

    const ir = await fetch(`${API_URL}/api/menu-items`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const ib = await ir.json().catch(() => ({}));
    if (!ir.ok) {
      console.error('Menu item failed:', item.foodName, ir.status, ib);
      process.exit(1);
    }
    console.log('Menu item:', ib.foodName, ib._id);
  }

  console.log('\nDone. Restaurant:', restaurant.name, '| id:', rid);
  console.log('Open the restaurant dashboard with this same account to see categories and items.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
