import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const OAuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUserFromOAuth } = useAuth();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      return;
    }

    if (token) {
      localStorage.setItem('foodAppToken', token);
      if (refreshToken) {
        localStorage.setItem('foodAppRefreshToken', refreshToken);
      }
      fetch(`${API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.ok ? res.json() : Promise.reject(new Error('Failed to fetch profile')))
        .then((data) => {
          if (data.user && setUserFromOAuth) setUserFromOAuth(data.user);
        })
        .catch(() => {})
        .finally(() => {
          setStatus('success');
          setTimeout(() => navigate('/', { replace: true }), 1500);
        });
    } else {
      setStatus('error');
    }
  }, [searchParams, navigate, setUserFromOAuth]);

  if (status === 'loading') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Signing you in...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center px-4">
        <div className="card p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-display font-bold text-gray-800 mb-2">Sign-in Failed</h1>
          <p className="text-gray-600 mb-6">We couldn&apos;t complete your sign-in. Please try again or use email and password.</p>
          <button onClick={() => navigate('/profile')} className="btn-primary">
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-gray-600">Successfully signed in! Redirecting...</p>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
