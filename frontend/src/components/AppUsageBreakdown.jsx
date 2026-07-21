import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function AppUsageBreakdown({ kidDeviceId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [kidDeviceId]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await api.get('/monitoring/activity', { params: { kidDeviceId, limit: 15 } });
      setActivities(res.data.activities);
    } catch (e) {
      console.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Mock list for fallback demonstration
  const mockActivities = [
    { type: 'app_open', appName: 'Instagram', timestamp: new Date(Date.now() - 500000) },
    { type: 'website_blocked', website: 'blocked-gaming-site.com', timestamp: new Date(Date.now() - 900000) },
    { type: 'app_open', appName: 'TikTok', timestamp: new Date(Date.now() - 1200000) },
    { type: 'app_open', appName: 'YouTube', timestamp: new Date(Date.now() - 2000000) },
    { type: 'website_blocked', website: 'adult-forum.org', timestamp: new Date(Date.now() - 3600000) },
  ];

  const dataList = activities.length > 0 ? activities : mockActivities;

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
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
          {dataList.map((act, index) => {
            const isBlock = act.type === 'website_blocked';
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
                    background: isBlock ? 'rgba(255, 56, 56, 0.15)' : 'rgba(0, 242, 254, 0.15)',
                    color: isBlock ? '#ff3838' : '#00f2fe',
                    marginRight: '10px'
                  }}>
                    {isBlock ? 'BLOCKED' : 'OPENED'}
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
      )}
    </div>
  );
}
