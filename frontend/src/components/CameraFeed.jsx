import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { WebRTCManager } from '../services/webrtc';

export default function CameraFeed({ kidDeviceId }) {
  const [streaming, setStreaming] = useState(false);
  const [recording, setRecording] = useState(false);
  const [facingMode, setFacingMode] = useState('back'); // 'front' or 'back'
  const [statusText, setStatusText] = useState('Offline');
  const videoRef = useRef(null);
  const rtcManagerRef = useRef(null);

  const socket = getSocket();

  useEffect(() => {
    if (!socket) return;

    // Instantiate WebRTC Manager for camera
    const rtc = new WebRTCManager(socket, kidDeviceId, 'camera');
    rtcManagerRef.current = rtc;

    rtc.onStatus((status) => {
      setStatusText(status);
    });

    rtc.onStream((stream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn('Auto-play blocked:', e));
      }
    });

    // Handle incoming WebRTC signaling from mobile device
    const handleRtcOffer = ({ offer, senderId }) => {
      console.log('Received WebRTC offer from kid device');
      rtc.handleOffer(offer, senderId);
    };

    const handleIceCandidate = ({ candidate }) => {
      rtc.handleIceCandidate(candidate);
    };

    socket.on('rtc-offer', handleRtcOffer);
    socket.on('ice-candidate', handleIceCandidate);

    socket.on('camera-started', () => {
      setStatusText('LIVE');
    });

    socket.on('camera-frame', (data) => {
      if (data.kidDeviceId === kidDeviceId) {
        setStatusText('LIVE');
      }
    });

    socket.on('camera-stopped', () => {
      setStatusText('Offline');
      setStreaming(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    });

    return () => {
      socket.off('rtc-offer', handleRtcOffer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('camera-started');
      socket.off('camera-frame');
      socket.off('camera-stopped');
      if (rtcManagerRef.current) {
        rtcManagerRef.current.close();
      }
    };
  }, [socket, kidDeviceId]);

  const startCamera = async () => {
    try {
      setStatusText('Connecting...');
      const response = await api.post('/surveillance/camera/start', { kidDeviceId });
      const { streamId } = response.data;

      if (socket) {
        socket.emit('camera-start', { kidDeviceId, streamId });
        socket.emit('camera-switch', { kidDeviceId, facing: facingMode });
      }

      setStreaming(true);
    } catch (error) {
      console.error('Failed to start camera:', error.message);
      setStatusText('Connection Failed');
    }
  };

  const stopCamera = async () => {
    try {
      if (recording) {
        await stopRecording();
      }
      await api.post('/surveillance/camera/stop', { kidDeviceId });
      if (socket) {
        socket.emit('camera-stop', { kidDeviceId });
      }
      if (rtcManagerRef.current) {
        rtcManagerRef.current.close();
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
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
    if (!rtcManagerRef.current) return;
    try {
      await api.post('/surveillance/camera/record/start', { kidDeviceId });
      if (socket) {
        socket.emit('camera-record-start', { kidDeviceId });
      }
      const success = rtcManagerRef.current.startRecording();
      if (success) {
        setRecording(true);
      }
    } catch (error) {
      console.error('Failed to start recording:', error.message);
    }
  };

  const stopRecording = async () => {
    if (!rtcManagerRef.current) return;
    try {
      const recordedBlob = await rtcManagerRef.current.stopRecording();
      setRecording(false);

      if (socket) {
        socket.emit('camera-record-stop', { kidDeviceId });
      }

      if (recordedBlob && recordedBlob.size > 0) {
        const formData = new FormData();
        formData.append('recording', recordedBlob, `camera_${Date.now()}.webm`);
        formData.append('kidDeviceId', kidDeviceId);
        formData.append('type', 'video');
        formData.append('duration', '30');

        const uploadRes = await api.post('/upload/recording', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        console.log('Recording uploaded & saved:', uploadRes.data);
      } else {
        // Fallback REST call
        await api.post('/surveillance/camera/record/stop', {
          kidDeviceId,
          duration: 30
        });
      }
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
            
            <video
              ref={videoRef}
              className="video-element"
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: statusText === 'LIVE' ? 'block' : 'none'
              }}
            />

            {statusText !== 'LIVE' && (
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
                    {statusText === 'Connecting...' ? 'Establishing WebRTC Link...' : `Waiting for stream from ${facingMode} camera...`}
                  </p>
                  {recording && (
                    <p style={{ color: '#ff3838', fontSize: '12px', animation: 'pulse 1s infinite', marginTop: '8px' }}>
                      🔴 RECORDING SESSION IN PROGRESS
                    </p>
                  )}
                </div>
              </div>
            )}
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
            Camera Feed Offline. Click Start Camera.
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
