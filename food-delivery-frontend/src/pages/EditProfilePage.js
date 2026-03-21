import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const EditProfilePage = () => {
  const { user, logout, changePassword, setUserFromOAuth } = useAuth();
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const [formData, setFormData] = useState({ fullName: '', email: '', contactNumber: '' });
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || user.name || '',
        email: user.email || '',
        contactNumber: user.contactNumber || '',
      });
      setProfilePicturePreview(user.profilePicture || null);
    }
  }, [user]);

  const handlePictureChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePictureFile(file);
      setProfilePicturePreview(URL.createObjectURL(file));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const token = localStorage.getItem('foodAppToken');
      const response = await fetch(`${API_URL}/users/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fullName: formData.fullName, email: formData.email, contactNumber: formData.contactNumber }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage({ type: 'error', text: data.message || data.error || 'Failed to update profile' });
        return;
      }
      if (profilePictureFile) {
        const fd = new FormData();
        fd.append('profilePicture', profilePictureFile);
        const picRes = await api.updateProfilePicture(fd);
        if (picRes?.profilePicture && data.user) data.user.profilePicture = picRes.profilePicture;
      }
      if (data.user && setUserFromOAuth) setUserFromOAuth(data.user);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => navigate('/profile'), 1500);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const result = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowChangePassword(false);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to change password' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('foodAppToken');
      const response = await fetch(`${API_URL}/users/${user._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        logout();
        navigate('/');
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || 'Failed to delete account' });
        setShowDeleteConfirm(false);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred.' });
      setShowDeleteConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    navigate('/profile');
    return null;
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <button onClick={() => navigate('/profile')} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 font-medium">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Profile
      </button>

      <h1 className="text-2xl font-display font-bold text-gray-800 mb-8">Edit Profile</h1>

      {message.text && (
        <div className={`mb-6 p-4 rounded-xl ${message.type === 'success' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="card p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Profile Picture</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-primary-100 text-primary-600 flex items-center justify-center text-2xl font-display font-bold flex-shrink-0">
                {profilePicturePreview ? (
                  <img src={profilePicturePreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  user?.fullName?.charAt(0) || user?.name?.charAt(0) || '?'
                )}
              </div>
              <div>
                <input type="file" accept="image/*" onChange={handlePictureChange} className="hidden" id="profile-pic" />
                <label htmlFor="profile-pic" className="btn-secondary cursor-pointer inline-block">
                  Change Photo
                </label>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG or GIF. Max 2MB.</p>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
            <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Number</label>
            <input type="tel" name="contactNumber" value={formData.contactNumber} onChange={handleChange} className="input-field" required />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" onClick={() => setShowDeleteConfirm(true)} className="btn-secondary border-red-200 text-red-600 hover:bg-red-50">
              Delete Account
            </button>
          </div>
        </form>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <h2 className="text-lg font-display font-semibold text-gray-800 mb-4">Change Password</h2>
          {!showChangePassword ? (
            <button
              type="button"
              onClick={() => setShowChangePassword(true)}
              className="btn-secondary"
            >
              Change Password
            </button>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                  className="input-field"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  className="input-field"
                  required
                  minLength={6}
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
                <button type="button" onClick={() => { setShowChangePassword(false); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-display font-semibold text-gray-800 mb-2">Delete Account</h2>
            <p className="text-gray-600 text-sm mb-6">
              This action cannot be undone. All your data will be permanently removed.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleDeleteAccount} disabled={loading} className="px-6 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50">
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditProfilePage;
