const axios = require('axios');
const logger = require('../utils/logger');

// Get directions between two points (using OpenStreetMap/OSRM API)
exports.getDirections = async (req, res) => {
  try {
    const { startLat, startLon, endLat, endLon } = req.query;
    
    if (!startLat || !startLon || !endLat || !endLon) {
      return res.status(400).json({ error: 'Missing coordinates' });
    }
    
    // Using OSRM (Open Source Routing Machine) for directions
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;
    
    const response = await axios.get(osrmUrl);
    
    if (!response.data || !response.data.routes || response.data.routes.length === 0) {
      return res.status(404).json({ error: 'No route found' });
    }
    
    const route = response.data.routes[0];
    
    return res.status(200).json({
      distance: route.distance / 1000, // Convert to kilometers
      duration: route.duration / 60, // Convert to minutes
      geometry: route.geometry
    });
  } catch (err) {
    logger.error(`Error getting directions: ${err.message}`);
    return res.status(500).json({ error: 'Failed to get directions' });
  }
};