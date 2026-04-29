import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Fix default marker assets with bundlers
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconRetinaUrl: iconRetina,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.mergeOptions({ icon: DefaultIcon });

function RecenterMap({ center, zoom = 14 }) {
  const map = useMap();
  useEffect(() => {
    if (center?.[0] != null && center?.[1] != null) {
      map.setView(center, zoom);
    }
  }, [center, map, zoom]);
  return null;
}

const DELIVERY_STATUS_LABEL = {
  PENDING: 'Pending',
  CONFIRMED: 'Finding driver',
  DRIVER_ASSIGNED: 'Driver assigned',
  PICKED_UP: 'Picked up',
  ON_THE_WAY: 'On the way',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  FAILED: 'Failed',
};

export default function OrderTrackPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orderPayload, setOrderPayload] = useState(null);
  const [deliveryTrack, setDeliveryTrack] = useState(null);
  const [pollTick, setPollTick] = useState(0);

  const loadOrderTrack = useCallback(async () => {
    const res = await api.trackOrder(orderId);
    const data = res.data || res;
    setOrderPayload(data);
  }, [orderId]);

  const loadDeliveryTrack = useCallback(async () => {
    const token = localStorage.getItem('foodAppToken');
    try {
      if (token && user?.role === 'customer') {
        const res = await api.trackDeliveryForCustomer(orderId);
        setDeliveryTrack(res.tracking || res);
        return;
      }
    } catch {
      /* fall back to public */
    }
    try {
      const res = await api.trackDelivery(orderId);
      setDeliveryTrack(res.tracking || res);
    } catch (e) {
      setDeliveryTrack(null);
    }
  }, [orderId, user?.role]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.trackOrder(orderId);
        const data = res.data || res;
        if (!cancelled) setOrderPayload(data);
        await loadDeliveryTrack();
      } catch (e) {
        if (!cancelled) setError(e.message || 'Could not load tracking');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, loadDeliveryTrack]);

  useEffect(() => {
    if (!deliveryTrack?.status) return;
    if (['DELIVERED', 'CANCELLED', 'FAILED'].includes(deliveryTrack.status)) return;
    const id = setInterval(() => setPollTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, [deliveryTrack?.status]);

  useEffect(() => {
    if (pollTick === 0) return;
    Promise.all([loadOrderTrack(), loadDeliveryTrack()]).catch(() => {});
  }, [pollTick, loadDeliveryTrack, loadOrderTrack]);

  const routeLine = useMemo(() => {
    const g = deliveryTrack?.routeGeometry;
    if (g?.type === 'LineString' && g.coordinates?.length) {
      return g.coordinates.map(([lng, lat]) => [lat, lng]);
    }
    return [];
  }, [deliveryTrack?.routeGeometry]);

  const pickup = deliveryTrack?.pickupLocation;
  const dropoff = deliveryTrack?.dropoffLocation;
  const driverLoc = deliveryTrack?.driver?.currentLocation;

  const mapCenter = useMemo(() => {
    if (driverLoc?.latitude != null && driverLoc?.longitude != null) {
      return [driverLoc.latitude, driverLoc.longitude];
    }
    if (pickup?.latitude != null && pickup?.longitude != null) {
      return [pickup.latitude, pickup.longitude];
    }
    if (dropoff?.latitude != null && dropoff?.longitude != null) {
      return [dropoff.latitude, dropoff.longitude];
    }
    return [6.9271, 79.8612];
  }, [driverLoc, pickup, dropoff]);

  const dStatus = deliveryTrack?.status;
  const showMap = deliveryTrack && dStatus && !['CANCELLED', 'FAILED'].includes(dStatus);

  if (loading || authLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48 mx-auto" />
          <div className="h-64 bg-gray-100 rounded-xl w-full max-w-xl mx-auto" />
        </div>
      </div>
    );
  }

  if (error || !orderPayload) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="card p-8 text-center">
          <p className="text-red-600 mb-4">{error || 'Order not found'}</p>
          <button type="button" onClick={() => navigate('/orders')} className="btn-primary">
            Back to orders
          </button>
        </div>
      </div>
    );
  }

  const eta =
    deliveryTrack?.currentEta ||
    deliveryTrack?.estimatedDeliveryTime ||
    orderPayload?.estimatedDeliveryTime;
  const etaDate = eta ? new Date(eta) : null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <button
        type="button"
        onClick={() => navigate('/orders')}
        className="text-sm text-primary-600 hover:text-primary-700 mb-6"
      >
        ← Your orders
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-800 mb-1">Track order</h1>
          <p className="text-sm text-gray-500">
            Order #{String(orderPayload.orderId || orderId).slice(-6).toUpperCase()}
            {orderPayload.totalAmount != null && (
              <span className="ml-2">· LKR {Number(orderPayload.totalAmount).toFixed(2)}</span>
            )}
          </p>
        </div>
        {dStatus && (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-primary-50 text-primary-800 border border-primary-100">
            {DELIVERY_STATUS_LABEL[dStatus] || dStatus}
          </span>
        )}
      </div>

      {etaDate && (
        <div className="card p-4 mb-6 bg-gradient-to-r from-primary-50 to-white border-primary-100">
          <p className="text-xs font-semibold text-primary-700 uppercase tracking-wider">Estimated arrival</p>
          <p className="text-xl font-bold text-gray-900">{etaDate.toLocaleString()}</p>
          {deliveryTrack?.routeDurationMinutes != null && (
            <p className="text-sm text-gray-600 mt-1">
              Route ~{Math.round(deliveryTrack.routeDurationMinutes)} min
            </p>
          )}
        </div>
      )}

      {deliveryTrack?.driver && (
        <div className="card p-5 mb-6 border border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Driver details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <p className="text-gray-700">
              <span className="font-semibold text-gray-900">Name:</span>{' '}
              {deliveryTrack.driver.name || 'Assigned'}
            </p>
            <p className="text-gray-700">
              <span className="font-semibold text-gray-900">Phone:</span>{' '}
              {deliveryTrack.driver.phone || 'Not available'}
            </p>
            {deliveryTrack.driver.vehicleDetails?.model && (
              <p className="text-gray-700 sm:col-span-2">
                <span className="font-semibold text-gray-900">Vehicle:</span>{' '}
                {deliveryTrack.driver.vehicleDetails.model}
                {deliveryTrack.driver.vehicleDetails.plateNumber
                  ? ` (${deliveryTrack.driver.vehicleDetails.plateNumber})`
                  : ''}
              </p>
            )}
          </div>
        </div>
      )}

      {user?.role === 'customer' && deliveryTrack?.deliveryOtp && dStatus === 'ON_THE_WAY' && (
        <div className="card p-5 mb-6 border-2 border-amber-200 bg-amber-50/80">
          <p className="text-sm font-semibold text-amber-900 mb-1">Handover code</p>
          <p className="text-3xl font-mono font-bold tracking-[0.35em] text-amber-950">
            {deliveryTrack.deliveryOtp}
          </p>
          <p className="text-xs text-amber-800 mt-2">
            Share this code with your driver only when you receive your order.
          </p>
        </div>
      )}

      {!deliveryTrack?.deliveryOtp && deliveryTrack?.deliveryOtpHint && dStatus === 'ON_THE_WAY' && (
        <div className="card p-4 mb-6 bg-slate-50 border border-slate-200">
          <p className="text-sm text-slate-700">
            <span className="font-semibold">Confirmation code</span> ends with{' '}
            <span className="font-mono">{String(deliveryTrack.deliveryOtpHint).replace(/\*/g, '')}</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">Sign in as the ordering customer to see the full code.</p>
        </div>
      )}

      {showMap && (pickup?.latitude != null || dropoff?.latitude != null) && (
        <div className="card p-0 overflow-hidden mb-8 shadow-lg border-0 ring-1 ring-gray-100">
          <div className="px-4 py-3 bg-gray-900 text-white flex justify-between items-center">
            <span className="text-sm font-semibold">Live map</span>
            {driverLoc?.latitude != null && (
              <span className="text-xs text-emerald-300">Driver location updating</span>
            )}
          </div>
          <MapContainer
            center={mapCenter}
            zoom={13}
            className="h-80 w-full z-0"
            scrollWheelZoom
          >
            <RecenterMap center={mapCenter} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {routeLine.length > 1 && (
              <Polyline positions={routeLine} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.85 }} />
            )}
            {pickup?.latitude != null && pickup?.longitude != null && (
              <Marker position={[pickup.latitude, pickup.longitude]}>
                <Popup>Pickup — restaurant</Popup>
              </Marker>
            )}
            {dropoff?.latitude != null && dropoff?.longitude != null && (
              <Marker position={[dropoff.latitude, dropoff.longitude]}>
                <Popup>Your address</Popup>
              </Marker>
            )}
            {driverLoc?.latitude != null && driverLoc?.longitude != null && (
              <Marker
                position={[driverLoc.latitude, driverLoc.longitude]}
                icon={L.divIcon({
                  className: 'driver-pulse',
                  html: '<div style="width:18px;height:18px;background:#10b981;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.35);"></div>',
                  iconSize: [18, 18],
                  iconAnchor: [9, 9],
                })}
              >
                <Popup>Your driver</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      )}

      <div className="card p-6 space-y-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Order status</p>
        <p className="text-lg font-medium text-gray-900">
          {orderPayload.statusLabel || orderPayload.status}
        </p>
        <ul className="space-y-3 border-t border-gray-100 pt-4">
          {(orderPayload.timeline || []).map((step, i) => (
            <li key={`${step.status}-${i}`} className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  step.done ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
                } ${step.current ? 'ring-2 ring-primary-400 ring-offset-2' : ''}`}
              >
                {step.done ? '✓' : i + 1}
              </span>
              <div>
                <p className={`font-medium ${step.current ? 'text-primary-700' : 'text-gray-800'}`}>
                  {step.label}
                </p>
                {step.current && <p className="text-xs text-primary-600">Current step</p>}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {user?.role === 'customer' && deliveryTrack && !['DELIVERED', 'CANCELLED', 'FAILED'].includes(dStatus) && (
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className="text-sm text-slate-600 underline hover:text-slate-800"
            onClick={async () => {
              const reason = window.prompt('Briefly describe the issue (optional)');
              try {
                await api.reportDeliveryException(orderId, 'LATE_DELIVERY', reason || 'Running late');
                alert('Thanks — we notified the restaurant.');
              } catch (e) {
                alert(e.message);
              }
            }}
          >
            Report a delay
          </button>
        </div>
      )}
    </div>
  );
}
