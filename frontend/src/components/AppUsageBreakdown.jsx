import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';

export default function AppUsageBreakdown({ kidDeviceId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();

    const socket = getSocket();
    if (socket) {
      const handleTelemetry = (data) => {
        if (data.kidDeviceId === kidDeviceId && (data.type === 'app_open' || data.type === 'app_usage' || data.type === 'website_blocked')) {
          setActivities(prev => [data, ...prev]);
        }
      };

      socket.on('telemetry-update', handleTelemetry);
      return () => {
        socket.off('telemetry-update', handleTelemetry);
      };
    }
  }, [kidDeviceId]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await api.get('/monitoring/activity', { params: { kidDeviceId, limit: 25 } });
      setActivities(res.data.activities || []);
    } catch (e) {
      console.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
        <h3>App Usage & Blocks</h3>
        <button onClick={fetchActivities} className="btn-ctrl" style={{ padding: '6px 12px', fontSize: '12px' }}>
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center' }}>Loading activities...</div>
      ) : activities.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
          {activities.map((act, index) => {
            const isBlock = act.type === 'website_blocked';
            const isUsage = act.type === 'app_usage';
            return (
              <div 
                key={index} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  padding: '10px 14px',
                  borderRadius: '8px'
                }}
              >
                <div>
                  <span style={{ 
                    fontSize: '11px', 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    fontWeight: 'bold',
                    background: isBlock ? 'rgba(255, 56, 56, 0.15)' : isUsage ? 'rgba(155, 81, 224, 0.15)' : 'rgba(0, 242, 254, 0.15)',
                    color: isBlock ? '#ff3838' : isUsage ? '#9b51e0' : '#00f2fe',
                    marginRight: '10px'
                  }}>
                    {isBlock ? 'BLOCKED' : isUsage ? `${act.screenTimeMinutes || 0}m USED` : 'OPENED'}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>
                    {isBlock ? act.website : act.appName}
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: '#a39bb8' }}>
                  {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a39bb8' }}>
          No app usage activity logged yet for this device.
        </div>
      )}
    </div>
  );
}
