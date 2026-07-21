import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { WebRTCManager } from '../services/webrtc';

export default function AudioStream({ kidDeviceId }) {
  const [listening, setListening] = useState(false);
  const [recording, setRecording] = useState(false);
  const [statusText, setStatusText] = useState('Offline');
  const [volumeLevel, setVolumeLevel] = useState(0);

  const audioRef = useRef(null);
  const rtcManagerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const animFrameRef = useRef(null);

  const socket = getSocket();

  useEffect(() => {
    if (!socket) return;

    const rtc = new WebRTCManager(socket, kidDeviceId, 'microphone');
    rtcManagerRef.current = rtc;

    rtc.onStatus((status) => {
      setStatusText(status);
    });

    rtc.onStream((stream) => {
      if (audioRef.current) {
        audioRef.current.srcObject = stream;
        audioRef.current.play().catch(e => console.warn('Audio auto-play blocked:', e));
      }
      setupAudioVisualizer(stream);
    });

    const handleRtcOffer = ({ offer, senderId }) => {
      rtc.handleOffer(offer, senderId);
    };

    const handleIceCandidate = ({ candidate }) => {
      rtc.handleIceCandidate(candidate);
    };

    socket.on('rtc-offer', handleRtcOffer);
    socket.on('ice-candidate', handleIceCandidate);

    socket.on('mic-stopped', () => {
      stopMicLocal();
    });

    return () => {
      socket.off('rtc-offer', handleRtcOffer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('mic-stopped');
      stopMicLocal();
    };
  }, [socket, kidDeviceId]);

  const setupAudioVisualizer = (stream) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        setVolumeLevel(Math.min(100, Math.round((average / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (e) {
      console.warn('Web Audio visualizer error:', e);
    }
  };

  const stopMicLocal = () => {
    setListening(false);
    setRecording(false);
    setStatusText('Offline');
    setVolumeLevel(0);

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
    }
    if (rtcManagerRef.current) {
      rtcManagerRef.current.close();
    }
    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }
  };

  const startMic = async () => {
    try {
      setStatusText('Connecting...');
      const response = await api.post('/surveillance/mic/start', { kidDeviceId });
      const { streamId } = response.data;
      if (socket) {
        socket.emit('mic-start', { kidDeviceId, streamId });
      }
      setListening(true);
    } catch (e) {
      console.error(e.message);
      setStatusText('Error');
    }
  };

  const stopMic = async () => {
    try {
      if (recording) {
        await stopAudioRecord();
      }
      if (socket) {
        socket.emit('mic-stop', { kidDeviceId });
      }
      stopMicLocal();
    } catch (e) {
      console.error(e.message);
    }
  };

  const startAudioRecord = async () => {
    if (!rtcManagerRef.current) return;
    try {
      await api.post('/surveillance/mic/record/start', { kidDeviceId });
      if (socket) {
        socket.emit('mic-record-start', { kidDeviceId });
      }
      const success = rtcManagerRef.current.startRecording();
      if (success) {
        setRecording(true);
      }
    } catch (e) {
      console.error(e.message);
    }
  };

  const stopAudioRecord = async () => {
    if (!rtcManagerRef.current) return;
    try {
      const recordedBlob = await rtcManagerRef.current.stopRecording();
      setRecording(false);

      if (socket) {
        socket.emit('mic-record-stop', { kidDeviceId });
      }

      if (recordedBlob && recordedBlob.size > 0) {
        const formData = new FormData();
        formData.append('recording', recordedBlob, `audio_${Date.now()}.webm`);
        formData.append('kidDeviceId', kidDeviceId);
        formData.append('type', 'audio');
        formData.append('duration', '30');

        const uploadRes = await api.post('/upload/recording', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        console.log('Audio recording saved:', uploadRes.data);
      } else {
        await api.post('/surveillance/mic/record/stop', { kidDeviceId });
      }
    } catch (e) {
      console.error(e.message);
    }
  };

  return (
    <div className="glass-card media-feed-container">
      <h3>Microphone Monitoring</h3>
      
      <audio ref={audioRef} autoPlay style={{ display: 'none' }} />

      <div className="video-screen" style={{ height: '140px' }}>
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
              {statusText === 'LIVE' ? 'MIC LIVE' : statusText}
            </div>

            {/* Dynamic Volume Audio Bars driven by real Web Audio API */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', height: '50px', marginTop: '15px' }}>
              <div style={{ width: '6px', height: `${Math.max(8, volumeLevel * 0.5)}px`, backgroundColor: '#00f2fe', borderRadius: '4px', transition: 'height 0.1s ease' }} />
              <div style={{ width: '6px', height: `${Math.max(12, volumeLevel * 0.9)}px`, backgroundColor: '#9b51e0', borderRadius: '4px', transition: 'height 0.1s ease' }} />
              <div style={{ width: '6px', height: `${Math.max(16, volumeLevel * 1.2)}px`, backgroundColor: '#ff007f', borderRadius: '4px', transition: 'height 0.1s ease' }} />
              <div style={{ width: '6px', height: `${Math.max(12, volumeLevel * 0.8)}px`, backgroundColor: '#00f2fe', borderRadius: '4px', transition: 'height 0.1s ease' }} />
              <div style={{ width: '6px', height: `${Math.max(8, volumeLevel * 0.4)}px`, backgroundColor: '#9b51e0', borderRadius: '4px', transition: 'height 0.1s ease' }} />
            </div>

            <p style={{ fontSize: '12px', color: '#a39bb8', marginTop: '10px' }}>
              {recording ? '🔴 Recording audio feed...' : `Live Stream Volume: ${volumeLevel}%`}
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
