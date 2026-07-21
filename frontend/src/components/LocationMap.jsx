import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';

export default function LocationMap({ kidDeviceId }) {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const socket = getSocket();

  useEffect(() => {
    fetchLocation();

    if (socket) {
      socket.on('telemetry-update', (data) => {
        if (data.kidDeviceId === kidDeviceId && data.type === 'location_update') {
          setLocation({
            latitude: data.latitude,
            longitude: data.longitude,
            address: 'GPS Live Coordinate Update',
            timestamp: new Date(),
            accuracy: data.accuracy || 10
          });
        }
      });
    }

    return () => {
      if (socket) socket.off('telemetry-update');
    };
  }, [kidDeviceId, socket]);

  const fetchLocation = async () => {
    try {
      setLoading(true);
      const res = await api.get('/monitoring/location', { params: { kidDeviceId } });
      setLocation(res.data.currentLocation);
    } catch (e) {
      console.error('Failed to get location:', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
        <h3>Real-time GPS Tracking</h3>
        <button onClick={fetchLocation} className="btn-ctrl" style={{ padding: '6px 12px', fontSize: '12px' }}>
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Loading GPS Coordinates...
        </div>
      ) : location ? (
        <div>
          <div className="map-placeholder" style={{ height: '200px' }}>
            <div className="map-grid-layer" />
            <div className="map-marker">
              <div className="marker-pin" />
              <div className="marker-pulse" />
            </div>
            <div className="map-info-box">
              <strong>Pin Address:</strong> {location.address || 'Unknown Address'}<br />
              <span style={{ fontSize: '11px', color: '#a39bb8' }}>
                Lat: {location.latitude.toFixed(6)} | Lng: {location.longitude.toFixed(6)} | Accuracy: {location.accuracy}m
              </span>
            </div>
          </div>
          <div style={{ marginTop: '12px', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Status: <strong style={{ color: '#00ff87' }}>📡 Active GPS Link</strong></span>
            <span>Updated: {new Date(location.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      ) : (
        <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a39bb8' }}>
          No Location telemetry available.
        </div>
      )}
    </div>
  );
}
