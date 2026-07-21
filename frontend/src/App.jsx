import React, { useState, useEffect } from 'react';
import LoginForm from './components/LoginForm';
import CameraFeed from './components/CameraFeed';
import AudioStream from './components/AudioStream';
import LocationMap from './components/LocationMap';
import ScreenTimeChart from './components/ScreenTimeChart';
import AppUsageBreakdown from './components/AppUsageBreakdown';
import SurveillanceHistory from './components/SurveillanceHistory';
import AppVisibilityControl from './components/AppVisibilityControl';
import AlertsPanel from './components/AlertsPanel';
import { initiateSocketConnection, disconnectSocket } from './services/socket';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedKid, setSelectedKid] = useState(null);

  // Auto-login if local tokens exist
  useEffect(() => {
    const parentId = localStorage.getItem('parent_id');
    const token = localStorage.getItem('parent_token');
    if (parentId && token) {
      // Mock validation success or hook to active state
      const mockUser = {
        parentId,
        kids: [
          { id: 'kid_1', name: "John's Android", deviceId: 'device_123' },
          { id: 'kid_2', name: "Sophia's iPhone", deviceId: 'device_456' }
        ]
      };
      setUser(mockUser);
      setSelectedKid(mockUser.kids[0]);
      initiateSocketConnection(parentId);
    }
    return () => disconnectSocket();
  }, []);

  const handleLoginSuccess = (data) => {
    // Populate default kids if backend response lacks them
    const kids = data.kids && data.kids.length > 0 ? data.kids : [
      { id: 'kid_1', name: "John's Android", deviceId: 'device_123' },
      { id: 'kid_2', name: "Sophia's iPhone", deviceId: 'device_456' }
    ];
    const fullUser = { ...data, kids };
    setUser(fullUser);
    setSelectedKid(kids[0]);
    initiateSocketConnection(data.parentId || localStorage.getItem('parent_id'));
  };

  const handleLogout = () => {
    localStorage.removeItem('parent_token');
    localStorage.removeItem('parent_id');
    setUser(null);
    setSelectedKid(null);
    disconnectSocket();
  };

  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', minHeight: '100vh', justifyContent: 'center' }}>
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar navigation */}
      <aside className="sidebar">
        <div className="logo-section">
          <h1>CropCure</h1>
          
          <div style={{ marginTop: '20px' }}>
            <span style={{ fontSize: '11px', color: '#a39bb8', textTransform: 'uppercase' }}>Select Target Device</span>
            <select 
              className="device-select" 
              style={{ width: '100%', marginTop: '6px' }}
              value={selectedKid ? selectedKid.deviceId : ''}
              onChange={(e) => {
                const kid = user.kids.find(k => k.deviceId === e.target.value);
                setSelectedKid(kid);
              }}
            >
              {user.kids.map(k => (
                <option key={k.id} value={k.deviceId}>{k.name}</option>
              ))}
            </select>
          </div>
        </div>

        <ul className="nav-links" style={{ marginTop: '30px', flexGrow: 1 }}>
          <li 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Live Dashboard
          </li>
          <li 
            className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📋 Audit Trails
          </li>
          <li 
            className={`nav-item ${activeTab === 'visibility' ? 'active' : ''}`}
            onClick={() => setActiveTab('visibility')}
          >
            🔒 Visibility Control
          </li>
        </ul>

        <div>
          <button 
            className="btn-ctrl" 
            onClick={handleLogout}
            style={{ width: '100%', background: 'rgba(255, 56, 56, 0.1)', borderColor: '#ff3838' }}
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main dashboard content panel */}
      <main className="main-content">
        <header className="header-bar">
          <div>
            <h2>{activeTab === 'dashboard' ? 'Live Telemetry & Surveillance' : activeTab === 'history' ? 'Surveillance Audit History' : 'App Visibility settings'}</h2>
            <p style={{ color: '#a39bb8', fontSize: '14px', marginTop: '4px' }}>
              Monitoring kid device: <strong>{selectedKid ? selectedKid.name : 'None Selected'}</strong>
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Parent Linking ID Display */}
            <div style={{
              background: 'rgba(0, 242, 254, 0.08)',
              border: '1px solid rgba(0, 242, 254, 0.2)',
              borderRadius: '10px',
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px'
            }}>
              <span style={{ color: '#a39bb8' }}>Parent ID:</span>
              <code style={{ color: '#00f2fe', fontWeight: 'bold' }}>{user.parentId || '669a8b123456789'}</code>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(user.parentId || '669a8b123456789');
                  alert('Parent ID copied to clipboard! Enter this ID in the Android app.');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#00f2fe',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '11px',
                  marginLeft: '4px'
                }}
              >
                📋 Copy
              </button>
            </div>

            <span style={{ 
              background: 'rgba(0, 255, 135, 0.15)', 
              color: '#00ff87', 
              padding: '6px 12px', 
              borderRadius: '20px', 
              fontSize: '12px', 
              fontWeight: 'bold' 
            }}>
              ● SECURE PIPELINE ESTABLISHED
            </span>
          </div>
        </header>

        {selectedKid && (
          <>
            {activeTab === 'dashboard' && (
              <div className="dashboard-grid">
                <CameraFeed kidDeviceId={selectedKid.deviceId} />
                <AudioStream kidDeviceId={selectedKid.deviceId} />
                <LocationMap kidDeviceId={selectedKid.deviceId} />
                <ScreenTimeChart kidDeviceId={selectedKid.deviceId} />
                <AppUsageBreakdown kidDeviceId={selectedKid.deviceId} />
                <AlertsPanel kidDeviceId={selectedKid.deviceId} />
              </div>
            )}

            {activeTab === 'history' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                <SurveillanceHistory kidDeviceId={selectedKid.deviceId} />
              </div>
            )}

            {activeTab === 'visibility' && (
              <div style={{ maxWidth: '600px' }}>
                <AppVisibilityControl kidDeviceId={selectedKid.deviceId} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
