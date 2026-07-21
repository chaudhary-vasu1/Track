import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';

export default function CameraFeed({ kidDeviceId }) {
  const [streaming, setStreaming] = useState(false);
  const [recording, setRecording] = useState(false);
  const [facingMode, setFacingMode] = useState('back'); // 'front' or 'back'
  const [statusText, setStatusText] = useState('Offline');
  const videoRef = useRef(null);

  const socket = getSocket();

  useEffect(() => {
    if (!socket) return;

    // Handle responses or feedback if any from device
    socket.on('camera-started', () => {
      setStatusText('LIVE');
    });

    socket.on('camera-stopped', () => {
      setStatusText('Offline');
      setStreaming(false);
    });

    return () => {
      socket.off('camera-started');
      socket.off('camera-stopped');
    };
  }, [socket]);

  const startCamera = async () => {
    try {
      const response = await api.post('/surveillance/camera/start', { kidDeviceId });
      const { streamId } = response.data;

      if (socket) {
        socket.emit('camera-start', { kidDeviceId, streamId });
        // Emit current facing mode preference upon start
        socket.emit('camera-switch', { kidDeviceId, facing: facingMode });
      }

      setStreaming(true);
      setStatusText('LIVE');
    } catch (error) {
      console.error('Failed to start camera:', error.message);
    }
  };

  const stopCamera = async () => {
    try {
      await api.post('/surveillance/camera/stop', { kidDeviceId });
      if (socket) {
        socket.emit('camera-stop', { kidDeviceId });
      }
      setStreaming(false);
      setRecording(false);
      setStatusText('Offline');
    } catch (error) {
      console.error('Failed to stop camera:', error.message);
    }
  };

  const toggleCameraFacing = () => {
    const nextFacing = facingMode === 'front' ? 'back' : 'front';
    setFacingMode(nextFacing);
    if (streaming && socket) {
      socket.emit('camera-switch', { kidDeviceId, facing: nextFacing });
    }
  };

  const startRecording = async () => {
    try {
      await api.post('/surveillance/camera/record/start', { kidDeviceId });
      if (socket) {
        socket.emit('camera-record-start', { kidDeviceId });
      }
      setRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error.message);
    }
  };

  const stopRecording = async () => {
    try {
      const response = await api.post('/surveillance/camera/record/stop', {
        kidDeviceId,
        duration: 30, // Mock 30 seconds
        s3Url: 'https://s3.amazonaws.com/cropcure-recordings/mock-video.mp4'
      });
      if (socket) {
        socket.emit('camera-record-stop', { kidDeviceId });
      }
      setRecording(false);
      console.log('Recording saved to S3:', response.data.s3Url);
    } catch (error) {
      console.error('Failed to stop recording:', error.message);
    }
  };

  return (
    <div className="glass-card media-feed-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Live Camera Monitor</h3>
        <span style={{ fontSize: '12px', color: '#ff007f', fontWeight: 'bold' }}>
          Lens: {facingMode.toUpperCase()}
        </span>
      </div>

      <div className="video-screen">
        {streaming ? (
          <>
            <div className="video-overlay-status">
              <span className="pulse-dot"></span>
              {statusText} ({facingMode.toUpperCase()})
            </div>
            {/* Simulation loop or actual WebRTC rendering */}
            <div style={{ 
              width: '100%', 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: '#160f38',
              backgroundImage: 'radial-gradient(circle, #251b5c, #0a051b)'
            }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '48px' }}>📹</span>
                <p style={{ marginTop: '10px', fontSize: '14px', color: '#00f2fe' }}>
                  Streaming Live Feed from {facingMode === 'front' ? 'Front-facing' : 'Rear'} Camera
                </p>
                {recording && (
                  <p style={{ color: '#ff3838', fontSize: '12px', animation: 'pulse 1s infinite' }}>
                    🔴 RECORDING SESSION IN PROGRESS
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#a39bb8',
            fontSize: '14px'
          }}>
            Camera Feed Offline. Click Start.
          </div>
        )}
      </div>

      <div className="control-bar">
        {!streaming ? (
          <button className="btn-ctrl" onClick={startCamera}>
            📷 Start Camera
          </button>
        ) : (
          <button className="btn-ctrl btn-ctrl-active" onClick={stopCamera}>
            ⏹ Stop Camera
          </button>
        )}

        <button 
          className="btn-ctrl" 
          onClick={toggleCameraFacing}
          disabled={!streaming}
          style={{ opacity: streaming ? 1 : 0.5 }}
        >
          🔄 Switch to {facingMode === 'front' ? 'Back' : 'Front'}
        </button>

        {!recording ? (
          <button 
            className="btn-ctrl" 
            onClick={startRecording} 
            disabled={!streaming}
            style={{ opacity: streaming ? 1 : 0.5 }}
          >
            🔴 Record Video
          </button>
        ) : (
          <button className="btn-ctrl btn-ctrl-active" onClick={stopRecording}>
            ⏹ Stop Recording
          </button>
        )}
      </div>
    </div>
  );
}
