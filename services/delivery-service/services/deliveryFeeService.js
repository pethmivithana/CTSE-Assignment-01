/**
 * Delivery Fee Calculation Service
 * Calculates delivery charges based on distance, base fee, and dynamic factors
 */

const BASE_FEE_LKR = 50;
const PER_KM_LKR = 25;
const MIN_FREE_DELIVERY_LKR = 1500;
const MAX_DELIVERY_KM = 25;
const SURGE_MULTIPLIERS = {
  'peak': 1.2,   // 12pm-2pm, 7pm-9pm
  'normal': 1.0,
  'off_peak': 0.9  // 2am-6am
};

function getSurgePeriod() {
  const hour = new Date().getHours();
  if ((hour >= 12 && hour < 14) || (hour >= 19 && hour < 21)) return 'peak';
  if (hour >= 2 && hour < 6) return 'off_peak';
  return 'normal';
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate delivery fee
 * @param {Object} params - { pickupLat, pickupLon, dropoffLat, dropoffLon, orderAmount }
 * @returns {Object} - { fee, distance, breakdown }
 */
exports.calculateFee = (params) => {
  const { pickupLat, pickupLon, dropoffLat, dropoffLon, orderAmount = 0 } = params;

  // Validate coordinates
  const valid = [pickupLat, pickupLon, dropoffLat, dropoffLon].every(
    v => typeof v === 'number' && !isNaN(v)
  );
  if (!valid) {
    return {
      success: false,
      error: 'Valid pickup and dropoff coordinates required',
      fee: BASE_FEE_LKR,
      distance: 0
    };
  }

  const distance = haversineDistance(pickupLat, pickupLon, dropoffLat, dropoffLon);
  const distanceKm = Math.min(Math.max(0, distance), MAX_DELIVERY_KM);

  let fee = BASE_FEE_LKR + Math.ceil(distanceKm * PER_KM_LKR);
  const surge = SURGE_MULTIPLIERS[getSurgePeriod()] || 1;
  fee = Math.round(fee * surge);

  const freeDelivery = orderAmount >= MIN_FREE_DELIVERY_LKR;
  const finalFee = freeDelivery ? 0 : fee;

  return {
    success: true,
    fee: finalFee,
    distance: Math.round(distanceKm * 100) / 100,
    breakdown: {
      baseFee: BASE_FEE_LKR,
      distanceFee: Math.ceil(distanceKm * PER_KM_LKR),
      surgeMultiplier: surge,
      freeDeliveryApplied: freeDelivery,
      minFreeDeliveryThreshold: MIN_FREE_DELIVERY_LKR
    }
  };
};
