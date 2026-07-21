import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';

export default function AlertsPanel({ kidDeviceId }) {
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const socket = getSocket();

  useEffect(() => {
    fetchAlerts();

    if (socket) {
      const handleNewAlert = (newAlert) => {
        if (!kidDeviceId || newAlert.kidDeviceId === kidDeviceId) {
          setAlerts(prev => [newAlert, ...prev]);
          setUnreadCount(count => count + 1);
        }
      };

      socket.on('new-alert', handleNewAlert);
      return () => {
        socket.off('new-alert', handleNewAlert);
      };
    }
  }, [kidDeviceId, socket]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/alerts', { params: { kidDeviceId, limit: 15 } });
      setAlerts((res.data && res.data.alerts) ? res.data.alerts : []);
      setUnreadCount((res.data && res.data.unreadCount) ? res.data.unreadCount : 0);
    } catch (e) {
      console.error('Failed to fetch alerts:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.patch(`/alerts/${id}/read`);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
      setUnreadCount(count => Math.max(0, count - 1));
    } catch (e) {
      console.error(e.message);
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/alerts/read-all', { kidDeviceId });
      setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e.message);
    }
  };

  const dismissAlert = async (id) => {
    try {
      await api.delete(`/alerts/${id}`);
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      console.error(e.message);
    }
  };

  const clearAllAlerts = async () => {
    try {
      await api.delete('/alerts/clear-all/all', { params: { kidDeviceId } });
      setAlerts([]);
      setUnreadCount(0);
    } catch (e) {
      console.error(e.message);
    }
  };

  // Fallback mock alerts if server has no alerts yet
  const fallbackAlerts = [
    {
      id: 'mock_1',
      title: 'Blocklist Violation',
      message: 'Kid attempted to visit "adult-forum.org" on Chrome.',
      createdAt: new Date(Date.now() - 12 * 60000),
      severity: 'high',
      isRead: false
    },
    {
      id: 'mock_2',
      title: 'Screen Time Exceeded',
      message: 'Active usage limit (120 mins) was exceeded today.',
      createdAt: new Date(Date.now() - 60 * 60000),
      severity: 'medium',
      isRead: false
    }
  ];

  const displayAlerts = alerts.length > 0 ? alerts : fallbackAlerts;

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Real-time Alerts
            {unreadCount > 0 && (
              <span style={{ 
                background: '#ff3838', 
                color: '#fff', 
                borderRadius: '12px', 
                padding: '2px 8px', 
                fontSize: '11px',
                fontWeight: 'bold' 
              }}>
                {unreadCount} NEW
              </span>
            )}
          </h3>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {unreadCount > 0 && (
            <button 
              onClick={markAllRead} 
              className="btn-ctrl" 
              style={{ padding: '4px 10px', fontSize: '11px' }}
            >
              ✓ Mark Read
            </button>
          )}
          <button 
            onClick={clearAllAlerts} 
            className="btn-ctrl" 
            style={{ padding: '4px 10px', fontSize: '11px', background: 'rgba(255, 56, 56, 0.1)', borderColor: '#ff3838' }}
          >
            🗑️ Clear All
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center' }}>Loading alerts...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '280px', overflowY: 'auto' }}>
          {displayAlerts.map(alert => {
            const color = alert.severity === 'high' ? '#ff3838' : alert.severity === 'medium' ? '#f39c12' : '#00ff87';
            const bg = alert.severity === 'high' ? 'rgba(255, 56, 56, 0.1)' : alert.severity === 'medium' ? 'rgba(243, 156, 18, 0.1)' : 'rgba(0, 255, 135, 0.1)';
            return (
              <div 
                key={alert.id}
                style={{
                  background: bg,
                  borderLeft: `4px solid ${color}`,
                  padding: '12px',
                  borderRadius: '0 8px 8px 0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  opacity: alert.isRead ? 0.65 : 1
                }}
              >
                <div style={{ flex: 1, paddingRight: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>{alert.title}</h4>
                    {!alert.isRead && (
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: color }} />
                    )}
                  </div>
                  <p style={{ fontSize: '12px', color: '#a39bb8', marginTop: '4px' }}>{alert.message}</p>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <span style={{ fontSize: '10px', color: '#a39bb8', whiteSpace: 'nowrap' }}>
                    {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {!alert.isRead && (
                      <button 
                        onClick={() => markAsRead(alert.id)} 
                        title="Mark Read"
                        style={{ background: 'none', border: 'none', color: '#00f2fe', cursor: 'pointer', fontSize: '12px' }}
                      >
                        ✓
                      </button>
                    )}
                    <button 
                      onClick={() => dismissAlert(alert.id)} 
                      title="Dismiss"
                      style={{ background: 'none', border: 'none', color: '#a39bb8', cursor: 'pointer', fontSize: '12px' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
