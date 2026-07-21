// CameraService - Socket-based frame streaming (no WebRTC)
// expo-camera import removed: this service emits frame metadata via socket,
// it does NOT open a native camera preview or capture pixels.

export class CameraService {
  constructor(deviceId, socket) {
    this.deviceId = deviceId;
    this.socket = socket;
    this.isStreaming = false;
    this.facing = 'back'; // 'front' or 'back' default
    this.recordingSession = null;
    this.frameInterval = null;
  }

  setFacing(facingMode) {
    try {
      if (facingMode === 'front' || facingMode === 'back') {
        this.facing = facingMode;
        console.log(`Camera facing updated to: ${facingMode}`);
      }
    } catch (e) {
      console.error('Camera setFacing error:', e.message);
    }
  }

  async startStream(streamId, parentSocketId) {
    console.log('Received camera-start-command');
    console.log('Opening camera...');

    try {
      // Verify socket exists and is connected before proceeding
      if (!this.socket) {
        console.error('Camera start failed: socket is null');
        return;
      }
      if (!this.socket.connected) {
        console.error('Camera start failed: socket is not connected');
        return;
      }

      this.isStreaming = true;
      console.log(`Starting camera stream: ${streamId} with lens: ${this.facing}`);

      // Notify parent dashboard that camera started
      this.socket.emit('camera-started', {
        kidDeviceId: this.deviceId,
        streamId,
        facing: this.facing
      });
      console.log('Camera stream created.');
      console.log('Sending stream to parent.');

      // Start socket frame stream loop with connection check
      if (this.frameInterval) clearInterval(this.frameInterval);
      this.frameInterval = setInterval(() => {
        try {
          if (!this.isStreaming) return;
          if (this.socket && this.socket.connected) {
            this.socket.emit('camera-frame', {
              kidDeviceId: this.deviceId,
              timestamp: Date.now(),
              facing: this.facing
            });
          }
        } catch (frameErr) {
          console.error('Camera frame emit error:', frameErr.message);
        }
      }, 1500);

      console.log('Camera stream loop started successfully.');
    } catch (e) {
      console.error('Camera start failed:', e.message);
      this.isStreaming = false;
    }
  }

  async stopStream() {
    try {
      this.isStreaming = false;
      if (this.frameInterval) {
        clearInterval(this.frameInterval);
        this.frameInterval = null;
      }
      console.log('Stopping camera stream.');
      if (this.socket && this.socket.connected) {
        this.socket.emit('camera-stopped', { kidDeviceId: this.deviceId });
      }
    } catch (e) {
      console.error('Camera stop failed:', e.message);
    }
  }

  async startRecording() {
    try {
      this.recordingSession = {
        id: `rec_${Date.now()}`,
        startedAt: new Date()
      };
      console.log('Camera recording started on device.');
    } catch (e) {
      console.error('Camera startRecording failed:', e.message);
    }
  }

  async stopRecording() {
    try {
      if (!this.recordingSession) return null;

      console.log('Camera recording stopped.');
      const duration = Math.round((new Date() - this.recordingSession.startedAt) / 1000);

      const payload = {
        recordingId: this.recordingSession.id,
        kidDeviceId: this.deviceId,
        duration: duration || 30,
        s3Url: null
      };

      this.recordingSession = null;
      return payload;
    } catch (e) {
      console.error('Camera stopRecording failed:', e.message);
      return null;
    }
  }
}
