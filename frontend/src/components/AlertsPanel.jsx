import React from 'react';

export default function AlertsPanel({ kidDeviceId }) {
  // Static mock notifications for hackathon/presentation setup
  const alerts = [
    {
      id: 1,
      title: 'Blocklist Violation',
      message: 'Kid attempted to visit "adult-forum.org" on Chrome.',
      time: '12 mins ago',
      severity: 'high'
    },
    {
      id: 2,
      title: 'Screen Time Exceeded',
      message: 'Active usage limit (120 mins) was exceeded today.',
      time: '1 hour ago',
      severity: 'medium'
    },
    {
      id: 3,
      title: 'Permissions Verified',
      message: 'All device permissions verified. Application transitioned to hidden status.',
      time: '3 hours ago',
      severity: 'low'
    }
  ];

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <h3>Real-time Alerts</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {alerts.map(alert => {
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
                alignItems: 'flex-start'
              }}
            >
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>{alert.title}</h4>
                <p style={{ fontSize: '12px', color: '#a39bb8', marginTop: '4px' }}>{alert.message}</p>
              </div>
              <span style={{ fontSize: '10px', color: '#a39bb8', whiteSpace: 'nowrap' }}>{alert.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
