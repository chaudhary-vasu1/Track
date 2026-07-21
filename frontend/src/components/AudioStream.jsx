import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';

export default function AudioStream({ kidDeviceId }) {
  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState(false);
  const socket = getSocket();

  const startMic = async () => {
    try {
      const response = await api.post('/surveillance/mic/start', { kidDeviceId });
      const { streamId } = response.data;
      if (socket) {
        socket.emit('mic-start', { kidDeviceId, streamId });
      }
      setListening(true);
    } catch (e) {
      console.error(e.message);
    }
  };

  const stopMic = async () => {
    try {
      if (socket) {
        socket.emit('mic-stop', { kidDeviceId });
      }
      setListening(false);
      setRecording(false);
    } catch (e) {
      console.error(e.message);
    }
  };

  const startAudioRecord = async () => {
    try {
      await api.post('/surveillance/mic/record/start', { kidDeviceId });
      if (socket) {
        socket.emit('mic-record-start', { kidDeviceId });
      }
      setRecording(true);
    } catch (e) {
      console.error(e.message);
    }
  };

  const stopAudioRecord = async () => {
    try {
      await api.post('/surveillance/mic/record/stop', { kidDeviceId });
      if (socket) {
        socket.emit('mic-record-stop', { kidDeviceId });
      }
      setRecording(false);
    } catch (e) {
      console.error(e.message);
    }
  };

  return (
    <div className="glass-card media-feed-container">
      <h3>Microphone Monitoring</h3>
      
      <div className="video-screen" style={{ aspectRation: 'unset', height: '140px' }}>
        {listening ? (
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #100a2b, #220e4d)'
          }}>
            <div className="video-overlay-status">
              <span className="pulse-dot"></span>
              MIC LIVE
            </div>
            {/* Pulsing Audio Bar simulation */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '50px' }}>
              <div style={{ width: '6px', height: '20px', backgroundColor: '#00f2fe', borderRadius: '4px', animation: 'pulse 0.6s infinite alternate' }} />
              <div style={{ width: '6px', height: '40px', backgroundColor: '#9b51e0', borderRadius: '4px', animation: 'pulse 0.4s infinite alternate 0.1s' }} />
              <div style={{ width: '6px', height: '15px', backgroundColor: '#ff007f', borderRadius: '4px', animation: 'pulse 0.5s infinite alternate 0.2s' }} />
              <div style={{ width: '6px', height: '35px', backgroundColor: '#00f2fe', borderRadius: '4px', animation: 'pulse 0.7s infinite alternate 0.3s' }} />
              <div style={{ width: '6px', height: '22px', backgroundColor: '#9b51e0', borderRadius: '4px', animation: 'pulse 0.3s infinite alternate 0.4s' }} />
            </div>
            <p style={{ fontSize: '12px', color: '#a39bb8', marginTop: '10px' }}>
              {recording ? '🔴 Recording audio feed...' : 'Listening in real-time...'}
            </p>
          </div>
        ) : (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#a39bb8',
            fontSize: '14px'
          }}>
            Microphone Offline. Click Start.
          </div>
        )}
      </div>

      <div className="control-bar">
        {!listening ? (
          <button className="btn-ctrl" onClick={startMic}>
            🎤 Start Listening
          </button>
        ) : (
          <button className="btn-ctrl btn-ctrl-active" onClick={stopMic}>
            ⏹ Stop Mic
          </button>
        )}

        {!recording ? (
          <button 
            className="btn-ctrl" 
            onClick={startAudioRecord} 
            disabled={!listening}
            style={{ opacity: listening ? 1 : 0.5 }}
          >
            🔴 Record Audio
          </button>
        ) : (
          <button className="btn-ctrl btn-ctrl-active" onClick={stopAudioRecord}>
            ⏹ Stop Record
          </button>
        )}
      </div>
    </div>
  );
}
