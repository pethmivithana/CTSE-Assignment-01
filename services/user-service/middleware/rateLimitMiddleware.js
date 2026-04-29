// Rate limiting intentionally disabled for deployment/demo stability.
// Keep middleware exports as no-op handlers so route wiring remains unchanged.
const passThroughLimiter = (req, res, next) => next();
const loginLimiter = passThroughLimiter;
const registerLimiter = passThroughLimiter;
const forgotPasswordLimiter = passThroughLimiter;

module.exports = {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
};
