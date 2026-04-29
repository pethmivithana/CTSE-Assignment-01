import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const LoginSignup = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [role, setRole] = useState('customer');
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantAddress, setRestaurantAddress] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [driverLicense, setDriverLicense] = useState('');
  const [nicNumber, setNicNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [forgotStep, setForgotStep] = useState(null);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');

  const { login, register, registerWithOTP, loginWithGoogle, requestPasswordReset, resetPasswordWithOTP } = useAuth();
  const [useOTPRegistration, setUseOTPRegistration] = useState(false);
  const [otpStep, setOtpStep] = useState('request');
  const [registrationOtp, setRegistrationOtp] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLogin && useOTPRegistration && otpStep === 'request') {
      handleRequestRegistrationOTP(e);
      return;
    }
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      if (isLogin) {
        const result = await login(email, password);
        if (result.success) {
          if (result.firstTimeLoginMessage) {
            sessionStorage.setItem('postFirstRoleLoginMessage', result.firstTimeLoginMessage);
          } else {
            sessionStorage.setItem('postLoginMessage', 'Successfully logged in.');
          }
          if (onSuccess) onSuccess();
        } else {
          setError(result.message || 'Invalid email or password');
        }
      } else if (useOTPRegistration && otpStep === 'verify') {
        const payload = {
          email,
          otp: registrationOtp,
          fullName,
          password,
          contactNumber,
          role,
          restaurantName: role === 'restaurantManager' ? restaurantName : undefined,
          restaurantAddress: role === 'restaurantManager' ? restaurantAddress : undefined,
          vehicleType: role === 'deliveryPerson' ? vehicleType : undefined,
          vehicleModel: role === 'deliveryPerson' ? vehicleModel : undefined,
          licensePlate: role === 'deliveryPerson' ? licensePlate : undefined,
          driverLicense: role === 'deliveryPerson' ? driverLicense : undefined,
          nicNumber: role === 'deliveryPerson' ? nicNumber : undefined,
        };
        const result = await registerWithOTP('verify', payload);
        if (result.success) {
          if (!result.requiresApproval && onSuccess) {
            const welcomeMessage = result.welcomeMessage || 'Congratulations! Registration successful. You can now enjoy delicious food on Feedo.';
            sessionStorage.setItem('postRegisterWelcomeMessage', welcomeMessage);
            onSuccess();
            return;
          }
          setSuccessMessage(result.message);
          setOtpStep('request');
          setUseOTPRegistration(false);
        } else setError(result.message || 'Verification failed');
      } else {
        const restaurantInfo = role === 'restaurantManager' ? { name: restaurantName, address: restaurantAddress } : null;
        const driverInfo = role === 'deliveryPerson' ? { vehicleType, vehicleModel, licensePlate, driverLicense, nicNumber } : null;
        const result = await register(fullName, email, password, contactNumber, role, restaurantInfo, driverInfo);
        if (result.success) {
          if (!result.requiresApproval && onSuccess) {
            const welcomeMessage = result.welcomeMessage || 'Congratulations! Registration successful. You can now enjoy delicious food on Feedo.';
            sessionStorage.setItem('postRegisterWelcomeMessage', welcomeMessage);
            onSuccess();
            return;
          }
          setSuccessMessage(result.message);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          if (result.requiresApproval) { /* stay */ }
        } else setError(result.message || 'Registration failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestRegistrationOTP = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Email is required'); return; }
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const result = await registerWithOTP('request', { email });
      if (result.success) {
        setSuccessMessage(result.message || 'OTP sent! Check your email.');
        setOtpStep('verify');
      } else setError(result.message || 'Failed to send OTP');
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccessMessage('');
    setForgotStep(null);
    setForgotEmail('');
    setForgotOtp('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setUseOTPRegistration(false);
    setOtpStep('request');
    setRegistrationOtp('');
  };

  const handleForgotPassword = () => {
    setForgotStep('email');
    setForgotEmail(email || '');
    setError('');
    setSuccessMessage('');
  };

  const handleBackToLogin = () => {
    setForgotStep(null);
    setForgotEmail('');
    setForgotOtp('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setError('');
    setSuccessMessage('');
  };

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setError('Please enter your email');
      return;
    }
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const result = await requestPasswordReset(forgotEmail.trim());
      if (result.success) {
        setSuccessMessage(result.message || 'OTP sent! Check your email.');
        setForgotStep('otp');
      } else {
        setError(result.message || 'Failed to send OTP');
      }
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (forgotNewPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const result = await resetPasswordWithOTP(forgotEmail, forgotOtp, forgotNewPassword);
      if (result.success) {
        setSuccessMessage(result.message || 'Password reset! You can now sign in.');
        setForgotStep('done');
      } else {
        setError(result.message || 'Failed to reset password');
      }
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (forgotStep) {
    return (
      <div className="max-w-md mx-auto">
        <div className="card p-8">
          <button
            type="button"
            onClick={handleBackToLogin}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 font-medium text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Sign In
          </button>
          <h2 className="text-xl font-display font-bold text-gray-800 mb-2">Forgot Password</h2>
          <p className="text-gray-600 text-sm mb-6">
            {forgotStep === 'email' && 'Enter your email and we\'ll send you an OTP to reset your password.'}
            {forgotStep === 'otp' && 'Enter the OTP sent to your email and your new password.'}
            {forgotStep === 'done' && 'Your password has been reset.'}
          </p>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
              {error}
            </div>
          )}
          {successMessage && forgotStep !== 'done' && (
            <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 text-sm">
              {successMessage}
            </div>
          )}

          {forgotStep === 'done' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm">
                {successMessage}
              </div>
              <button type="button" onClick={handleBackToLogin} className="btn-primary w-full py-3.5">
                Back to Sign In
              </button>
            </div>
          ) : forgotStep === 'email' ? (
            <form onSubmit={handleRequestOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="input-field"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <button type="submit" disabled={isLoading} className="btn-primary w-full py-3.5">
                {isLoading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">OTP (6 digits)</label>
                <input
                  type="text"
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input-field text-center tracking-[0.5em] text-lg"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                <input
                  type="password"
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  className="input-field"
                  placeholder="At least 6 characters"
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  className="input-field"
                  placeholder="Confirm your new password"
                  minLength={6}
                  required
                />
              </div>
              <button type="submit" disabled={isLoading} className="btn-primary w-full py-3.5">
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="card p-8">
        <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
          <button
            type="button"
            onClick={() => !isLogin && resetForm()}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${isLogin ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-600'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => isLogin && resetForm()}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${!isLogin ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-600'}`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 text-sm">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Number</label>
                <input type="tel" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">I am a</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="input-field" required>
                  <option value="customer">Customer</option>
                  <option value="restaurantManager">Restaurant Manager</option>
                  <option value="deliveryPerson">Delivery Person</option>
                </select>
                {role !== 'customer' && (
                  <p className="mt-1.5 text-xs text-amber-600">Your account will require admin approval before you can sign in.</p>
                )}
              </div>
              {role === 'restaurantManager' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Restaurant Name</label>
                    <input type="text" value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} className="input-field" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Restaurant Address</label>
                    <textarea value={restaurantAddress} onChange={(e) => setRestaurantAddress(e.target.value)} className="input-field" rows="3" required />
                  </div>
                </>
              )}
              {role === 'deliveryPerson' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Vehicle Type</label>
                    <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} className="input-field" required>
                      <option value="">Select</option>
                      <option value="MOTORCYCLE">Motorcycle</option>
                      <option value="CAR">Car</option>
                      <option value="BICYCLE">Bicycle</option>
                      <option value="VAN">Van</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Vehicle Model</label>
                    <input type="text" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} className="input-field" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">License Plate</label>
                    <input type="text" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} className="input-field" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Driver's License</label>
                    <input type="text" value={driverLicense} onChange={(e) => setDriverLicense(e.target.value)} className="input-field" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">NIC Number</label>
                    <input type="text" value={nicNumber} onChange={(e) => setNicNumber(e.target.value)} className="input-field" required />
                  </div>
                </>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" required minLength={6} />
            {isLogin && (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Forgot password?
              </button>
            )}
          </div>

          {!isLogin && useOTPRegistration && otpStep === 'verify' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Verification OTP (sent to email)</label>
              <input
                type="text"
                value={registrationOtp}
                onChange={(e) => setRegistrationOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input-field text-center tracking-[0.5em] text-lg"
                placeholder="000000"
                maxLength={6}
                required
              />
            </div>
          )}

          <button type="submit" disabled={isLoading} className="btn-primary w-full py-3.5">
            {isLoading ? 'Please wait...' : isLogin ? 'Sign In' : useOTPRegistration && otpStep === 'verify' ? 'Verify & Create Account' : useOTPRegistration ? 'Send OTP' : 'Create Account'}
          </button>

          {!isLogin && !useOTPRegistration && (
            <button
              type="button"
              onClick={() => setUseOTPRegistration(true)}
              className="w-full py-2.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Prefer to register with OTP verification?
            </button>
          )}
          {!isLogin && useOTPRegistration && (
            <button
              type="button"
              onClick={() => { setUseOTPRegistration(false); setOtpStep('request'); setRegistrationOtp(''); }}
              className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700"
            >
              Use regular registration instead
            </button>
          )}

          {!isLogin && otpStep === 'request' && useOTPRegistration && (
            <p className="text-xs text-gray-500 text-center">
              Enter your details above, then click &quot;Send OTP&quot;. We&apos;ll send a code to your email to verify your account.
            </p>
          )}
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-center text-sm text-gray-500 mb-3">Or continue with</p>
          <button
            type="button"
            onClick={loginWithGoogle}
            className="w-full py-3 px-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 flex items-center justify-center gap-3 font-medium text-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginSignup;
