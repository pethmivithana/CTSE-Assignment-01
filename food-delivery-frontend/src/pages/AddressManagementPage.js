import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const LABELS = ['Home', 'Work', 'Other'];

const AddressManagementPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    label: 'Home',
    street: '',
    city: '',
    postalCode: '',
    state: '',
    country: 'Sri Lanka',
    additionalInfo: '',
    isDefault: false,
  });

  useEffect(() => {
    if (!user) {
      navigate('/profile');
      return;
    }
    loadAddresses();
  }, [user, navigate]);

  const loadAddresses = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await api.getAddresses();
      setAddresses(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || 'Failed to load addresses');
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      label: 'Home',
      street: '',
      city: '',
      postalCode: '',
      state: '',
      country: 'Sri Lanka',
      additionalInfo: '',
      isDefault: false,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (addr) => {
    setEditingId(addr._id);
    setFormData({
      label: addr.label || 'Home',
      street: addr.street || '',
      city: addr.city || '',
      postalCode: addr.postalCode || '',
      state: addr.state || '',
      country: addr.country || 'Sri Lanka',
      additionalInfo: addr.additionalInfo || '',
      isDefault: addr.isDefault || false,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.updateAddress(editingId, formData);
      } else {
        await api.addAddress(formData);
      }
      await loadAddresses();
      resetForm();
    } catch (err) {
      setError(err.message || 'Failed to save address');
    }
  };

  const handleDelete = async (addressId) => {
    if (!window.confirm('Delete this address?')) return;
    setError('');
    try {
      await api.deleteAddress(addressId);
      await loadAddresses();
      if (editingId === addressId) resetForm();
    } catch (err) {
      setError(err.message || 'Failed to delete address');
    }
  };

  const handleSetDefault = async (addressId) => {
    setError('');
    try {
      await api.setDefaultAddress(addressId);
      await loadAddresses();
    } catch (err) {
      setError(err.message || 'Failed to set default');
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/profile')}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          aria-label="Back"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-display font-bold text-gray-800">Saved Addresses</h1>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <svg className="animate-spin h-10 w-10 text-primary-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {addresses.map((addr) => (
              <div
                key={addr._id}
                className={`card p-5 transition-all duration-300 hover:shadow-lg ${
                  addr.isDefault ? 'ring-2 ring-primary-500' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800 capitalize">{addr.label}</span>
                      {addr.isDefault && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mt-1">{addr.street}</p>
                    <p className="text-gray-500 text-sm">{addr.city}, {addr.postalCode}{addr.state ? `, ${addr.state}` : ''}</p>
                    {addr.additionalInfo && <p className="text-gray-400 text-sm mt-1">{addr.additionalInfo}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!addr.isDefault && (
                      <button
                        onClick={() => handleSetDefault(addr._id)}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Set default
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(addr)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                      aria-label="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(addr._id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                      aria-label="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {showForm ? (
            <div className="card p-6 shadow-lg">
              <h2 className="text-lg font-display font-semibold text-gray-800 mb-4">
                {editingId ? 'Edit Address' : 'Add New Address'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                  <select
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="input-field"
                  >
                    {LABELS.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
                  <input
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    className="input-field"
                    placeholder="123 Main St"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="input-field"
                      placeholder="City"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                    <input
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      className="input-field"
                      placeholder="12345"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State / Province (optional)</label>
                  <input
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="input-field"
                    placeholder="State"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="input-field"
                    placeholder="Country"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Additional Info (optional)</label>
                  <input
                    value={formData.additionalInfo}
                    onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                    className="input-field"
                    placeholder="Apartment, floor, landmarks..."
                  />
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-primary-500"
                  />
                  <span className="text-sm text-gray-700">Set as default address</span>
                </label>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="btn-primary">
                    {editingId ? 'Update' : 'Add'} Address
                  </button>
                  <button type="button" onClick={resetForm} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="w-full py-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-primary-400 hover:bg-primary-50/30 transition-all flex items-center justify-center gap-2 text-gray-600 hover:text-primary-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add new address
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default AddressManagementPage;
