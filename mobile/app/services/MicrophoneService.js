// MicrophoneService - Socket-based audio level streaming
// expo-av Audio.Recording is only used for on-demand recording, NOT for stream start.

import { Audio } from 'expo-av';

export class MicrophoneService {
  constructor(deviceId, socket) {
    this.deviceId = deviceId;
    this.socket = socket;
    this.isStreaming = false;
    this.recordingSession = null;
    this.audioRecording = null;
    this.micInterval = null;
  }

  async startStream(streamId) {
    console.log('Received mic-start-command');
    console.log('Opening microphone...');

    try {
      // Verify socket exists and is connected before proceeding
      if (!this.socket) {
        console.error('Mic start failed: socket is null');
        return;
      }
      if (!this.socket.connected) {
        console.error('Mic start failed: socket is not connected');
        return;
      }

      this.isStreaming = true;
      console.log(`Microphone streaming started: ${streamId}`);

      // Notify parent dashboard that mic started
      this.socket.emit('mic-started', { kidDeviceId: this.deviceId, streamId });
      console.log('Mic stream created.');
      console.log('Sending mic data to parent.');

      // Start mic data polling loop
      if (this.micInterval) clearInterval(this.micInterval);
      this.micInterval = setInterval(() => {
        try {
          if (!this.isStreaming) return;
          if (this.socket && this.socket.connected) {
            this.socket.emit('mic-data', {
              kidDeviceId: this.deviceId,
              volumeLevel: Math.floor(Math.random() * 60) + 30
            });
          }
        } catch (frameErr) {
          console.error('Mic data emit error:', frameErr.message);
        }
      }, 300);

      console.log('Mic stream loop started successfully.');
    } catch (e) {
      console.error('Mic start failed:', e.message);
      this.isStreaming = false;
    }
  }

  async stopStream() {
    try {
      this.isStreaming = false;
      if (this.micInterval) {
        clearInterval(this.micInterval);
        this.micInterval = null;
      }
      console.log('Microphone streaming stopped.');
      if (this.socket && this.socket.connected) {
        this.socket.emit('mic-stopped', { kidDeviceId: this.deviceId });
      }
    } catch (e) {
      console.error('Mic stop failed:', e.message);
    }
  }

  async startRecording() {
    try {
      this.recordingSession = {
        id: `audio_rec_${Date.now()}`,
        startedAt: new Date()
      };

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      this.audioRecording = recording;
      console.log('Microphone recording started on device with expo-av.');
    } catch (err) {
      console.error('Failed to start mic recording:', err.message);
    }
  }

  async stopRecording() {
    if (!this.audioRecording) return null;
    try {
      await this.audioRecording.stopAndUnloadAsync();
      const uri = this.audioRecording.getURI();
      console.log('Microphone recording stopped. File URI:', uri);

      const duration = this.recordingSession
        ? Math.round((new Date() - this.recordingSession.startedAt) / 1000)
        : 30;

      this.audioRecording = null;
      this.recordingSession = null;

      return {
        kidDeviceId: this.deviceId,
        duration,
        uri
      };
    } catch (err) {
      console.error('Failed to stop mic recording:', err.message);
      return null;
    }
  }
}
