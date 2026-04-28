/**
 * Protect internal microservice routes. Set INTERNAL_API_KEY in production.
 */
exports.requireInternalKey = (req, res, next) => {
  const key = process.env.INTERNAL_API_KEY;
  if (!key) {
    return next();
  }
  const sent = req.headers['x-internal-key'] || req.headers['x-api-key'];
  if (sent !== key) {
    return res.status(403).json({ success: false, message: 'Invalid internal API key' });
  }
  next();
};
