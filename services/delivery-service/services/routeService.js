const axios = require('axios');
const logger = require('../utils/logger');

/**
 * OSRM public demo server — for production use self-hosted OSRM or Mapbox.
 */
async function getRoutePickupToDropoff(pickup, dropoff) {
  const lon1 = pickup.longitude;
  const lat1 = pickup.latitude;
  const lon2 = dropoff.longitude;
  const lat2 = dropoff.latitude;
  if ([lon1, lat1, lon2, lat2].some((x) => x == null || Number.isNaN(Number(x)))) {
    return null;
  }
  const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`;
  try {
    const { data } = await axios.get(url, { timeout: 8000 });
    if (!data?.routes?.length) return null;
    const route = data.routes[0];
    return {
      distanceKm: route.distance / 1000,
      durationMinutes: route.duration / 60,
      geometry: route.geometry,
    };
  } catch (e) {
    logger.warn(`OSRM route failed: ${e.message}`);
    return null;
  }
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/** ETA from driver position to dropoff (minutes), rough driving speed ~ 28 km/h urban */
function etaMinutesFromDriver(driverLat, driverLon, dropLat, dropLon) {
  const km = haversineKm(driverLat, driverLon, dropLat, dropLon);
  const hours = km / 28;
  return Math.max(3, Math.round(hours * 60));
}

module.exports = { getRoutePickupToDropoff, haversineKm, etaMinutesFromDriver };
