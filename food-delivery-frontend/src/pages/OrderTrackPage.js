import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

function FitMapToBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!Array.isArray(points) || points.length < 2) return;
    const valid = points.filter((p) => Array.isArray(p) && p[0] != null && p[1] != null);
    if (valid.length < 2) return;
    map.fitBounds(valid, { padding: [36, 36], maxZoom: 15 });
  }, [map, points]);
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
  const [showRateDriver, setShowRateDriver] = useState(false);
  const [driverRating, setDriverRating] = useState(5);
  const [driverFeedback, setDriverFeedback] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [displayedDriverLoc, setDisplayedDriverLoc] = useState(null);
  const [driverLastUpdatedAt, setDriverLastUpdatedAt] = useState(null);
  const [driverUpdatedAgoSec, setDriverUpdatedAgoSec] = useState(0);
  const animRef = useRef(null);
  const driverLat = deliveryTrack?.driver?.currentLocation?.latitude;
  const driverLng = deliveryTrack?.driver?.currentLocation?.longitude;

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
    const id = setInterval(() => setPollTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, [deliveryTrack?.status]);

  useEffect(() => {
    if (pollTick === 0) return;
    Promise.all([loadOrderTrack(), loadDeliveryTrack()]).catch(() => {});
  }, [pollTick, loadDeliveryTrack, loadOrderTrack]);

  useEffect(() => {
    if (driverLat == null || driverLng == null) return;
    setDriverLastUpdatedAt(new Date());
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setDisplayedDriverLoc((prev) => {
      if (!prev || prev.latitude == null || prev.longitude == null) {
        return { latitude: driverLat, longitude: driverLng };
      }
      const start = performance.now();
      const duration = 1200;
      const fromLat = prev.latitude;
      const fromLng = prev.longitude;
      const toLat = driverLat;
      const toLng = driverLng;
      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - (1 - t) * (1 - t);
        setDisplayedDriverLoc({
          latitude: fromLat + (toLat - fromLat) * eased,
          longitude: fromLng + (toLng - fromLng) * eased,
        });
        if (t < 1) animRef.current = requestAnimationFrame(tick);
      };
      animRef.current = requestAnimationFrame(tick);
      return prev;
    });
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [driverLat, driverLng]);

  useEffect(() => {
    if (!driverLastUpdatedAt) return undefined;
    setDriverUpdatedAgoSec(0);
    const id = setInterval(() => {
      setDriverUpdatedAgoSec(Math.max(0, Math.floor((Date.now() - new Date(driverLastUpdatedAt).getTime()) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [driverLastUpdatedAt]);

  const routeLine = useMemo(() => {
    const g = deliveryTrack?.routeGeometry;
    if (g?.type === 'LineString' && g.coordinates?.length) {
      return g.coordinates.map(([lng, lat]) => [lat, lng]);
    }
    return [];
  }, [deliveryTrack?.routeGeometry]);

  const pickup = deliveryTrack?.pickupLocation;
  const dropoff = deliveryTrack?.dropoffLocation;
  const driverLoc = displayedDriverLoc || deliveryTrack?.driver?.currentLocation;

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

  const mapPoints = useMemo(() => {
    const pts = [];
    if (pickup?.latitude != null && pickup?.longitude != null) pts.push([pickup.latitude, pickup.longitude]);
    if (dropoff?.latitude != null && dropoff?.longitude != null) pts.push([dropoff.latitude, dropoff.longitude]);
    if (driverLoc?.latitude != null && driverLoc?.longitude != null) pts.push([driverLoc.latitude, driverLoc.longitude]);
    return pts;
  }, [pickup, dropoff, driverLoc]);

  const displayRoute = useMemo(() => {
    if (routeLine.length > 1) return routeLine;
    const p = pickup?.latitude != null && pickup?.longitude != null ? [pickup.latitude, pickup.longitude] : null;
    const d = dropoff?.latitude != null && dropoff?.longitude != null ? [dropoff.latitude, dropoff.longitude] : null;
    const r = driverLoc?.latitude != null && driverLoc?.longitude != null ? [driverLoc.latitude, driverLoc.longitude] : null;
    if (r && p && d) return [r, p, d];
    if (p && d) return [p, d];
    if (r && d) return [r, d];
    return [];
  }, [routeLine, pickup, dropoff, driverLoc]);

  const routeArrows = useMemo(() => {
    if (!Array.isArray(displayRoute) || displayRoute.length < 2) return [];
    const out = [];
    for (let i = 0; i < displayRoute.length - 1; i += 1) {
      const a = displayRoute[i];
      const b = displayRoute[i + 1];
      if (!a || !b) continue;
      const dLat = b[0] - a[0];
      const dLng = b[1] - a[1];
      const angle = (Math.atan2(dLng, dLat) * 180) / Math.PI;
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      out.push({ id: `${i}-${a[0]}-${a[1]}`, mid, angle });
    }
    return out;
  }, [displayRoute]);

  const dStatus = deliveryTrack?.status;
  const showMap = deliveryTrack && dStatus && !['DELIVERED', 'CANCELLED', 'FAILED'].includes(dStatus);
  const locationFreshnessLabel =
    driverLastUpdatedAt == null
      ? 'No recent update'
      : driverUpdatedAgoSec <= 35
      ? 'Live'
      : driverUpdatedAgoSec <= 90
      ? 'Delayed'
      : 'No recent update';
  const locationFreshnessClass =
    locationFreshnessLabel === 'Live'
      ? 'bg-emerald-100 text-emerald-700'
      : locationFreshnessLabel === 'Delayed'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-gray-200 text-gray-700';

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
            <div className="flex items-center gap-2">
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${locationFreshnessClass}`}>
                {locationFreshnessLabel}
              </span>
              {driverLoc?.latitude != null && driverLastUpdatedAt && (
                <span className="text-xs text-emerald-300">Last updated: {driverUpdatedAgoSec}s ago</span>
              )}
            </div>
          </div>
          <MapContainer
            center={mapCenter}
            zoom={13}
            className="h-80 w-full z-0"
            scrollWheelZoom
          >
            <RecenterMap center={mapCenter} />
            <FitMapToBounds points={mapPoints} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {displayRoute.length > 1 && (
              <>
                <Polyline positions={displayRoute} pathOptions={{ color: '#111827', weight: 7, opacity: 0.9 }} />
                <Polyline positions={displayRoute} pathOptions={{ color: '#facc15', weight: 3, opacity: 0.95 }} />
              </>
            )}
            {routeArrows.map((arrow) => (
              <Marker
                key={arrow.id}
                position={arrow.mid}
                icon={L.divIcon({
                  className: 'route-arrow-marker',
                  html: `<div style="transform: rotate(${arrow.angle}deg); color:#111827; font-size:14px; font-weight:700;">➤</div>`,
                  iconSize: [14, 14],
                  iconAnchor: [7, 7],
                })}
              />
            ))}
            {pickup?.latitude != null && pickup?.longitude != null && (
              <Marker
                position={[pickup.latitude, pickup.longitude]}
                icon={L.divIcon({
                  className: 'pickup-marker',
                  html: '<div style="width:18px;height:18px;background:#facc15;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.35);"></div>',
                  iconSize: [18, 18],
                  iconAnchor: [9, 9],
                })}
              >
                <Popup>Restaurant pickup point</Popup>
              </Marker>
            )}
            {dropoff?.latitude != null && dropoff?.longitude != null && (
              <Marker
                position={[dropoff.latitude, dropoff.longitude]}
                icon={L.divIcon({
                  className: 'dropoff-marker',
                  html: '<div style="width:18px;height:18px;background:#facc15;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.35);"></div>',
                  iconSize: [18, 18],
                  iconAnchor: [9, 9],
                })}
              >
                <Popup>Your address</Popup>
              </Marker>
            )}
            {driverLoc?.latitude != null && driverLoc?.longitude != null && (
              <Marker
                position={[driverLoc.latitude, driverLoc.longitude]}
                icon={L.divIcon({
                  className: 'driver-pulse',
                  html: '<div class="driver-animated-dot"></div>',
                  iconSize: [24, 24],
                  iconAnchor: [12, 12],
                })}
              >
                <Popup>Your driver</Popup>
              </Marker>
            )}
          </MapContainer>
          <div className="px-4 py-2 bg-white border-t flex flex-wrap gap-2 text-xs text-gray-700">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100"><span className="w-2 h-2 rounded-full bg-emerald-500" />Driver</span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100"><span className="w-2 h-2 rounded-full bg-amber-400" />Pickup</span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100"><span className="w-2 h-2 rounded-full bg-amber-400" />Destination</span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100"><span className="text-[10px]">➤</span>Direction</span>
          </div>
        </div>
      )}
      <style>{`
        .driver-animated-dot{
          width:18px;height:18px;background:#10b981;border:3px solid #fff;border-radius:9999px;
          box-shadow:0 2px 8px rgba(0,0,0,.35);position:relative;
        }
        .driver-animated-dot::after{
          content:'';position:absolute;inset:-6px;border:2px solid rgba(16,185,129,.45);border-radius:9999px;
          animation: driverPulse 1.6s ease-out infinite;
        }
        @keyframes driverPulse {0%{transform:scale(.8);opacity:.9}100%{transform:scale(1.45);opacity:0}}
      `}</style>

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

      {user?.role === 'customer' && dStatus === 'DELIVERED' && deliveryTrack?.driver && (
        <div className="mt-6">
          <button
            type="button"
            className="btn-secondary py-2 px-4 text-sm"
            onClick={() => setShowRateDriver(true)}
            disabled={deliveryTrack?.rating != null}
          >
            {deliveryTrack?.rating != null ? 'Driver already rated' : 'Rate delivery driver'}
          </button>
        </div>
      )}

      {showRateDriver && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowRateDriver(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Rate your delivery driver</h3>
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setDriverRating(star)}
                  className={`text-2xl ${driverRating >= star ? 'text-amber-500' : 'text-gray-300'}`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={driverFeedback}
              onChange={(e) => setDriverFeedback(e.target.value)}
              className="input-field min-h-[100px] mb-4"
              maxLength={400}
              placeholder="Share feedback about delivery experience..."
            />
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn-secondary" onClick={() => setShowRateDriver(false)}>Cancel</button>
              <button
                type="button"
                className="btn-primary"
                disabled={ratingSubmitting}
                onClick={async () => {
                  try {
                    setRatingSubmitting(true);
                    const delivery = await api.getDeliveryByOrderId(orderId);
                    await api.rateDelivery(delivery._id || delivery.id, {
                      rating: driverRating,
                      feedback: driverFeedback,
                    });
                    await loadDeliveryTrack();
                    setShowRateDriver(false);
                  } catch (e) {
                    alert(e.message || 'Failed to submit rating');
                  } finally {
                    setRatingSubmitting(false);
                  }
                }}
              >
                {ratingSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
