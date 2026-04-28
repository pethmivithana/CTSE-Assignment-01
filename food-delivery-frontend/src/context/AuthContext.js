import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  const USER_CACHE_KEY = 'foodAppUser';

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const token = localStorage.getItem('foodAppToken');
        if (!token) {
          setLoading(false);
          return;
        }

        const cachedUserRaw = localStorage.getItem(USER_CACHE_KEY);
        if (cachedUserRaw) {
          try {
            setUser(JSON.parse(cachedUserRaw));
          } catch (_) {
            localStorage.removeItem(USER_CACHE_KEY);
          }
        }

        const response = await fetch(`${API_URL}/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          // Only clear auth for real auth failures.
          // Avoid forcing logout on transient gateway/network errors.
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('foodAppToken');
            localStorage.removeItem('foodAppRefreshToken');
            localStorage.removeItem(USER_CACHE_KEY);
            setUser(null);
          }
          throw new Error('Token verification failed');
        }

        const data = await response.json();
        setUser(data.user);
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(data.user));
      } catch (error) {
        console.error('Token verification failed:', error);
        // Keep existing token/user cache on non-auth errors to prevent refresh logouts.
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [API_URL]);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('foodAppToken', data.token);
      if (data.refreshToken) localStorage.setItem('foodAppRefreshToken', data.refreshToken);
      if (data.user) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, message: error.message || 'Login failed' };
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('foodAppToken');
      const refreshToken = localStorage.getItem('foodAppRefreshToken');
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (e) { /* ignore */ }
    localStorage.removeItem('foodAppToken');
    localStorage.removeItem('foodAppRefreshToken');
    localStorage.removeItem(USER_CACHE_KEY);
    setUser(null);
    window.location.href = '/';
  };

  const loginWithGoogle = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  const setUserFromOAuth = (userData) => {
    setUser(userData);
    if (userData) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(userData));
  };

  const register = async (
    fullName, 
    email, 
    password, 
    contactNumber, 
    role = 'customer', 
    restaurantInfo = null,
    driverInfo = null
  ) => {
    try {
      // Validation for restaurant managers
      if (role === 'restaurantManager') {
        if (!restaurantInfo || !restaurantInfo.name || !restaurantInfo.address) {
          throw new Error('Restaurant name and address are required for restaurant managers');
        }
      }
      
      // Validation for delivery persons
      if (role === 'deliveryPerson') {
        if (!driverInfo || 
            !driverInfo.vehicleType || 
            !driverInfo.vehicleModel || 
            !driverInfo.licensePlate ||
            !driverInfo.driverLicense ||
            !driverInfo.nicNumber) {
          throw new Error('All driver information is required for delivery persons');
        }
      }
      
      // Create request body
      const requestBody = { 
        fullName, 
        email, 
        password, 
        contactNumber, 
        role 
      };
      
      // Add restaurant information if role is restaurant manager
      if (role === 'restaurantManager' && restaurantInfo) {
        requestBody.restaurantName = restaurantInfo.name;
        requestBody.restaurantAddress = restaurantInfo.address;
      }
      
      // Add driver information if role is delivery person
      if (role === 'deliveryPerson' && driverInfo) {
        requestBody.vehicleType = driverInfo.vehicleType;
        requestBody.vehicleModel = driverInfo.vehicleModel;
        requestBody.licensePlate = driverInfo.licensePlate;
        requestBody.driverLicense = driverInfo.driverLicense;
        requestBody.nicNumber = driverInfo.nicNumber;
      }
  
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
  
      // For non-customer roles, user needs to wait for approval
      if (role !== 'customer') {
        return {
          success: true,
          requiresApproval: true,
          message: 'Registration successful! Your account is pending approval.'
        };
      }
  
      // For customers, we can log them in immediately
      if (data.token) {
        localStorage.setItem('foodAppToken', data.token);
        if (data.refreshToken) localStorage.setItem('foodAppRefreshToken', data.refreshToken);
        if (data.user) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(data.user));
        setUser(data.user);
      }
  
      return {
        success: true,
        requiresApproval: false,
        message: 'Registration successful!'
      };
    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, message: error.message || 'Registration failed' };
    }
  };

  const hasRole = (roleToCheck) => {
    return user && user.role === roleToCheck;
  };

  const requestPasswordReset = async (email) => {
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to send OTP');
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, message: error.message || 'Failed to send OTP' };
    }
  };

  const resetPasswordWithOTP = async (email, otp, newPassword) => {
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to reset password');
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, message: error.message || 'Failed to reset password' };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const token = localStorage.getItem('foodAppToken');
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to change password');
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, message: error.message || 'Failed to change password' };
    }
  };

  const registerWithOTP = async (step, payload) => {
    try {
      if (step === 'request') {
        const res = await fetch(`${API_URL}/auth/register/request-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: payload.email, contactNumber: payload.contactNumber }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
        return { success: true, message: data.message };
      }
      if (step === 'verify') {
        const res = await fetch(`${API_URL}/auth/register/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to verify');
        if (data.user && payload.role === 'customer') {
          return { success: true, message: 'Account created! Please sign in.', user: data.user };
        }
        return {
          success: true,
          requiresApproval: payload.role !== 'customer',
          message: payload.role === 'customer'
            ? 'Account created! Please sign in.'
            : 'Registration successful! Your account is pending approval.',
        };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      register,
      registerWithOTP,
      loginWithGoogle,
      setUserFromOAuth,
      requestPasswordReset,
      resetPasswordWithOTP,
      changePassword,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      isRestaurantManager: user?.role === 'restaurantManager',
      isDeliveryPerson: user?.role === 'deliveryPerson',
      isCustomer: user?.role === 'customer',
      hasRole
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;