import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const DeliveryDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('deliveries');
  const [driver, setDriver] = useState(null);
  const [availableDeliveries, setAvailableDeliveries] = useState([]);
  const [myDeliveries, setMyDeliveries] = useState({ currentDelivery: null, completedDeliveries: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [podOpen, setPodOpen] = useState(false);
  const [podOtp, setPodOtp] = useState('');
  const [podPhoto, setPodPhoto] = useState(null);
  const [geoActive, setGeoActive] = useState(false);

  const loadData = async (trySync = true) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      let driverRes = await api.getDriverProfile().catch(() => null);
      // If no driver profile, try to sync (registers with delivery service if approval previously failed)
      if (!driverRes?.driver && trySync) {
        await api.registerDriverProfile().catch(() => {});
        driverRes = await api.getDriverProfile().catch(() => null);
      }
      setDriver(driverRes);
      const availableRes = await api.getAvailableDeliveries().catch(() => []);
      setAvailableDeliveries(Array.isArray(availableRes) ? availableRes : []);
      if (driverRes?.driver?.id) {
        const myRes = await api.getDriverDeliveries(driverRes.driver.id).catch(() => ({ currentDelivery: null, completedDeliveries: [] }));
        setMyDeliveries(myRes);
      }
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'deliveryPerson') {
      loadData();
    } else if (user && user.role !== 'deliveryPerson') {
      navigate('/');
    }
  }, [user, navigate]);

  /** Share live location while on an active delivery */
  useEffect(() => {
    const cur = myDeliveries.currentDelivery;
    const driverId = driver?.driver?.id;
    if (!cur?._id || !driverId || !['PICKED_UP', 'ON_THE_WAY', 'DRIVER_ASSIGNED'].includes(cur.status)) {
      return undefined;
    }
    if (!geoActive || !navigator.geolocation) return undefined;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        api.updateDriverLocation(driverId, latitude, longitude).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [geoActive, myDeliveries.currentDelivery, driver?.driver?.id]);


  const handleToggleAvailability = async () => {
    if (!driver?.driver) return;
    setUpdating('availability');
    try {
      await api.updateDriverAvailability(driver.driver.id, !driver.driver.isAvailable);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleAcceptDelivery = async (deliveryId) => {
    if (!driver?.driver) return;
    setUpdating(deliveryId);
    try {
      await api.acceptDelivery(driver.driver.id, deliveryId);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleUpdateStatus = async (deliveryId, status) => {
    if (!driver?.driver) return;
    if (status === 'DELIVERED') {
      setPodOpen(true);
      setPodOtp('');
      setPodPhoto(null);
      return;
    }
    setUpdating(deliveryId);
    try {
      await api.updateDeliveryStatus(driver.driver.id, deliveryId, status);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleSubmitDelivery = async () => {
    if (!driver?.driver || !myDeliveries.currentDelivery?._id) return;
    const deliveryId = myDeliveries.currentDelivery._id;
    setUpdating(deliveryId);
    try {
      const body = { status: 'DELIVERED', deliveryOtp: podOtp.trim() || undefined };
      if (podPhoto) {
        const dataUrl = await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = reject;
          r.readAsDataURL(podPhoto);
        });
        body.photoBase64 = dataUrl;
      }
      await api.updateDeliveryStatus(driver.driver.id, deliveryId, body);
      setPodOpen(false);
      setPodOtp('');
      setPodPhoto(null);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(null);
    }
  };

  if (authLoading || (user && user.role !== 'deliveryPerson')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }
  if (!user) {
    navigate('/');
    return null;
  }

  const tabs = [
    { id: 'deliveries', label: 'Deliveries', icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'earnings', label: 'Earnings', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  const d = driver?.driver;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Delivery Dashboard</h1>
            <p className="text-gray-600 mt-1">{d?.name || user?.fullName || 'Driver'}</p>
          </div>
          {d && (
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${d.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                {d.isAvailable ? 'Available' : 'Busy'}
              </span>
              <button
                onClick={handleToggleAvailability}
                disabled={updating === 'availability' || (d.currentDelivery && !d.isAvailable)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${d.isAvailable ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-green-500 text-white hover:bg-green-600'}`}
              >
                {updating === 'availability' ? '...' : d.isAvailable ? 'Go Offline' : 'Go Online'}
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => { setError(null); loadData(); }} className="px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-sm font-medium">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="card p-12 text-center text-gray-500 animate-pulse">Loading...</div>
        ) : !d ? (
          <div className="card p-12 text-center ring-2 ring-red-300 bg-red-50 border-red-200">
            <p className="text-gray-700 mb-4">Driver profile not found. You may need to be approved by admin first.</p>
            <button onClick={loadData} className="px-6 py-3 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 transition-all">Retry</button>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${activeTab === t.id ? 'bg-primary-500 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={t.icon} />
                  </svg>
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === 'deliveries' && (
              <div className="space-y-6">
                {myDeliveries.currentDelivery && (
                  <div className="card overflow-hidden border-2 border-primary-200">
                    <h2 className="text-lg font-semibold px-6 py-4 bg-primary-50 border-b">Current Delivery</h2>
                    <div className="p-6 space-y-4">
                      <p><span className="font-medium">Order:</span> #{myDeliveries.currentDelivery.orderId?.slice(-6)}</p>
                      <p><span className="font-medium">Pickup:</span> {myDeliveries.currentDelivery.pickupLocation?.address}</p>
                      <p><span className="font-medium">Dropoff:</span> {myDeliveries.currentDelivery.dropoffLocation?.address}</p>
                      <p><span className="font-medium">Distance:</span> {myDeliveries.currentDelivery.distance?.toFixed(1)} km</p>
                      <p><span className="font-medium">Status:</span> {myDeliveries.currentDelivery.status}</p>
                      <div className="flex gap-2 flex-wrap">
                        {myDeliveries.currentDelivery.status === 'DRIVER_ASSIGNED' && (
                          <button onClick={() => handleUpdateStatus(myDeliveries.currentDelivery._id, 'PICKED_UP')} disabled={updating} className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium">Picked Up</button>
                        )}
                        {myDeliveries.currentDelivery.status === 'PICKED_UP' && (
                          <button onClick={() => handleUpdateStatus(myDeliveries.currentDelivery._id, 'ON_THE_WAY')} disabled={updating} className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium">On the Way</button>
                        )}
                        {myDeliveries.currentDelivery.status === 'ON_THE_WAY' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(myDeliveries.currentDelivery._id, 'DELIVERED')}
                            disabled={updating}
                            className="px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-medium"
                          >
                            Complete delivery
                          </button>
                        )}
                      </div>
                      {myDeliveries.currentDelivery && ['DRIVER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY'].includes(myDeliveries.currentDelivery.status) && (
                        <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center gap-3">
                          <span className="text-sm text-gray-600">Live tracking</span>
                          <button
                            type="button"
                            onClick={() => setGeoActive((g) => !g)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${geoActive ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                          >
                            {geoActive ? 'Sharing location' : 'Share my location'}
                          </button>
                          <p className="text-xs text-gray-500 w-full">Turn on so customers see your position on the map.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {d.isAvailable && availableDeliveries.length > 0 && (
                  <div className="card overflow-hidden">
                    <h2 className="text-lg font-semibold px-6 py-4 bg-red-50 border-b">Available Deliveries ({availableDeliveries.length})</h2>
                    <div className="divide-y">
                      {availableDeliveries.map((del) => (
                        <div key={del._id} className="p-6 flex flex-wrap justify-between items-center gap-4">
                          <div>
                            <p className="font-medium">Order #{del.orderId?.slice(-6)}</p>
                            <p className="text-sm text-gray-600">{del.pickupLocation?.address} → {del.dropoffLocation?.address}</p>
                            <p className="text-sm text-gray-500">{del.distance?.toFixed(1)} km</p>
                          </div>
                          <button
                            onClick={() => handleAcceptDelivery(del._id)}
                            disabled={updating === del._id}
                            className="px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-50"
                          >
                            {updating === del._id ? '...' : 'Accept'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!myDeliveries.currentDelivery && (!d.isAvailable || availableDeliveries.length === 0)) && (
                  <div className="card p-12 text-center text-gray-500">
                    <p>No deliveries at the moment. {d.isAvailable ? 'Go online to receive new requests.' : ''}</p>
                  </div>
                )}

                {myDeliveries.completedDeliveries?.length > 0 && (
                  <div className="card overflow-hidden">
                    <h2 className="text-lg font-semibold px-6 py-4 bg-gray-50 border-b">Recent Completed</h2>
                    <div className="divide-y max-h-64 overflow-y-auto">
                      {myDeliveries.completedDeliveries.slice(0, 10).map((del) => (
                        <div key={del._id} className="px-6 py-3 flex justify-between items-center">
                          <span>Order #{del.orderId?.slice(-6)}</span>
                          <span className="text-sm text-gray-500">{new Date(del.updatedAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="card p-6 max-w-xl">
                <h2 className="text-lg font-semibold mb-6">Driver Profile</h2>
                <dl className="space-y-4">
                  <div><dt className="text-sm text-gray-500">Name</dt><dd className="font-medium">{d.name}</dd></div>
                  <div><dt className="text-sm text-gray-500">Email</dt><dd>{d.email}</dd></div>
                  <div><dt className="text-sm text-gray-500">Phone</dt><dd>{d.phone}</dd></div>
                  <div><dt className="text-sm text-gray-500">Vehicle</dt><dd>{d.vehicleType} - {d.vehicleDetails?.model} ({d.vehicleDetails?.licensePlate})</dd></div>
                  <div><dt className="text-sm text-gray-500">Rating</dt><dd>{d.rating?.toFixed(1) || '—'} ★</dd></div>
                  <div><dt className="text-sm text-gray-500">Total Deliveries</dt><dd>{d.totalDeliveries || 0}</dd></div>
                </dl>
              </div>
            )}

            {activeTab === 'earnings' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="card p-6">
                  <p className="text-sm text-gray-500">Total Deliveries</p>
                  <p className="text-2xl font-bold text-primary-600">{d.totalDeliveries || 0}</p>
                </div>
                <div className="card p-6">
                  <p className="text-sm text-gray-500">Rating</p>
                  <p className="text-2xl font-bold">{d.rating?.toFixed(1) || '—'} ★</p>
                </div>
                <div className="card p-6">
                  <p className="text-sm text-gray-500">Completed (30 days)</p>
                  <p className="text-2xl font-bold">{myDeliveries.completedDeliveries?.length || 0}</p>
                </div>
                <div className="card p-6 col-span-full">
                  <p className="text-gray-500 text-sm">Earnings are calculated per delivery. Contact admin for payout details.</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {podOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Complete delivery</h3>
            <p className="text-sm text-gray-600">Enter the code the customer shows you, and optionally add a photo of the handover.</p>
            <label className="block text-sm font-medium text-gray-700">Confirmation code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={8}
              value={podOtp}
              onChange={(e) => setPodOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl text-lg tracking-widest font-mono"
              placeholder="6-digit code"
            />
            <label className="block text-sm font-medium text-gray-700">Photo (optional)</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setPodPhoto(e.target.files?.[0] || null)}
              className="text-sm w-full"
            />
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" className="px-4 py-2 rounded-xl text-gray-700 bg-gray-100" onClick={() => setPodOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                disabled={!!updating}
                onClick={handleSubmitDelivery}
                className="px-4 py-2 rounded-xl bg-green-600 text-white font-medium disabled:opacity-50"
              >
                {updating ? 'Submitting…' : 'Confirm delivery'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryDashboard;
