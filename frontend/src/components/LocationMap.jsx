import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';
import { getSocket } from '../services/socket';

// Fix Leaflet marker icon issue in React build
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom neon ping icon
const neonIcon = L.divIcon({
  className: 'custom-neon-marker',
  html: `<div class="marker-pin"></div><div class="marker-pulse"></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

export default function LocationMap({ kidDeviceId }) {
  const [location, setLocation] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const socket = getSocket();

  useEffect(() => {
    fetchLocation();

    if (socket) {
      const handleTelemetry = (data) => {
        if (data.kidDeviceId === kidDeviceId && data.type === 'location_update') {
          const newPos = {
            latitude: data.latitude,
            longitude: data.longitude,
            address: 'GPS Live Coordinate Update',
            timestamp: new Date(),
            accuracy: data.accuracy || 10
          };
          setLocation(newPos);
          setHistory(prev => [[data.latitude, data.longitude], ...prev]);
        }
      };

      socket.on('telemetry-update', handleTelemetry);
      return () => {
        socket.off('telemetry-update', handleTelemetry);
      };
    }
  }, [kidDeviceId, socket]);

  const fetchLocation = async () => {
    try {
      setLoading(true);
      const res = await api.get('/monitoring/location', { params: { kidDeviceId } });
      setLocation(res.data.currentLocation);
      if (res.data.historicalLocations) {
        setHistory(res.data.historicalLocations.map(h => [h.latitude, h.longitude]));
      }
    } catch (e) {
      console.error('Failed to get location:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const centerPosition = location ? [location.latitude, location.longitude] : [28.7041, 77.1025];

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
          <div style={{ height: '220px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
            <MapContainer 
              center={centerPosition} 
              zoom={14} 
              scrollWheelZoom={false} 
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {history.length > 1 && (
                <Polyline positions={history} color="#00f2fe" weight={4} opacity={0.7} dashArray="5, 10" />
              )}
              <Marker position={centerPosition} icon={neonIcon}>
                <Popup>
                  <strong>{location.address || 'Kid Location'}</strong><br />
                  Accuracy: {location.accuracy || 10}m<br />
                  Updated: {new Date(location.timestamp).toLocaleTimeString()}
                </Popup>
              </Marker>
            </MapContainer>
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
