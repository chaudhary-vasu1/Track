import { Camera } from 'expo-camera';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export class CameraService {
  constructor(deviceId, socket) {
    this.deviceId = deviceId;
    this.socket = socket;
    this.isStreaming = false;
    this.facing = 'back'; // 'front' or 'back' default
    this.recordingSession = null;
    this.peerConnection = null;
    this.localStream = null;
  }

  setFacing(facingMode) {
    if (facingMode === 'front' || facingMode === 'back') {
      this.facing = facingMode;
      console.log(`Camera facing updated to: ${facingMode}`);
    }
  }

  async startStream(streamId, parentSocketId) {
    this.isStreaming = true;
    console.log(`Starting camera stream: ${streamId} with lens: ${this.facing}`);

    try {
      // Create PeerConnection if WebRTC environment is supported
      if (typeof RTCPeerConnection !== 'undefined') {
        this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

        this.peerConnection.onicecandidate = (event) => {
          if (event.candidate && this.socket) {
            this.socket.emit('ice-candidate', {
              targetSocketId: parentSocketId,
              candidate: event.candidate
            });
          }
        };

        // Create WebRTC Offer to send to parent dashboard
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);

        if (this.socket) {
          this.socket.emit('rtc-offer', {
            kidDeviceId: this.deviceId,
            offer
          });
        }
      }

      if (this.socket) {
        this.socket.emit('camera-started', { kidDeviceId: this.deviceId, streamId });
      }
    } catch (e) {
      console.error('Camera stream error:', e.message);
    }
  }

  async handleAnswer(answer) {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  async handleIceCandidate(candidate) {
    if (this.peerConnection && candidate) {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  async stopStream() {
    this.isStreaming = false;
    console.log('Stopping camera stream.');
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
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
  }
}
