import { Audio } from 'expo-av';

export class MicrophoneService {
  constructor(deviceId, socket) {
    this.deviceId = deviceId;
    this.socket = socket;
    this.isStreaming = false;
    this.recordingSession = null;
    this.audioRecording = null;
  }

  async startStream(streamId) {
    this.isStreaming = true;
    console.log(`Microphone streaming started: ${streamId}`);
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      if (this.socket) {
        this.socket.emit('mic-started', { kidDeviceId: this.deviceId, streamId });
      }
    } catch (e) {
      console.error('Mic stream error:', e.message);
    }
  }

  async stopStream() {
    this.isStreaming = false;
    console.log('Microphone streaming stopped.');
    if (this.socket) {
      this.socket.emit('mic-stopped', { kidDeviceId: this.deviceId });
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
