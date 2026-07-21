export class MicrophoneService {
  constructor(deviceId, socket) {
    this.deviceId = deviceId;
    this.socket = socket;
    this.isStreaming = false;
    this.recordingSession = null;
  }

  async startStream(streamId) {
    this.isStreaming = true;
    console.log(`Microphone streaming started: ${streamId}`);
  }

  async stopStream() {
    this.isStreaming = false;
    console.log('Microphone streaming stopped.');
  }

  async startRecording() {
    this.recordingSession = {
      id: `audio_rec_${Date.now()}`,
      startedAt: new Date()
    };
    console.log('Microphone recording started on device.');
  }

  async stopRecording() {
    if (!this.recordingSession) return;
    console.log('Microphone recording stopped. Uploading to mock S3 storage...');
    this.recordingSession = null;
  }
}
