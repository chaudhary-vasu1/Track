export class CameraService {
  constructor(deviceId, socket) {
    this.deviceId = deviceId;
    this.socket = socket;
    this.isStreaming = false;
    this.facing = 'back'; // 'front' or 'back' default
    this.recordingSession = null;
  }

  setFacing(facingMode) {
    if (facingMode === 'front' || facingMode === 'back') {
      this.facing = facingMode;
      console.log(`Camera facing updated to: ${facingMode}`);
    }
  }

  async startStream(streamId) {
    this.isStreaming = true;
    console.log(`Starting camera stream: ${streamId} with lens: ${this.facing}`);
    
    // Simulate real-time frame transmission back to parent socket room
    if (this.socket) {
      this.socket.emit('camera-started', { kidDeviceId: this.deviceId, streamId });
    }
  }

  async stopStream() {
    this.isStreaming = false;
    console.log('Stopping camera stream.');
    if (this.socket) {
      this.socket.emit('camera-stopped', { kidDeviceId: this.deviceId });
    }
  }

  async startRecording() {
    this.recordingSession = {
      id: `rec_${Date.now()}`,
      startedAt: new Date()
    };
    console.log('Camera recording started on device.');
  }

  async stopRecording() {
    if (!this.recordingSession) return;
    
    console.log('Camera recording stopped. Uploading to mock S3 storage...');
    
    // Trigger S3 update API mock request
    const payload = {
      recordingId: this.recordingSession.id,
      kidDeviceId: this.deviceId,
      duration: 30,
      s3Url: 'https://s3.amazonaws.com/cropcure-recordings/mock-video.mp4'
    };

    this.recordingSession = null;
    return payload;
  }
}
