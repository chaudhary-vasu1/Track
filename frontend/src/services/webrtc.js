// Standard WebRTC PeerConnection Helper for Browser Dashboard

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export class WebRTCManager {
  constructor(socket, kidDeviceId, type = 'camera') {
    this.socket = socket;
    this.kidDeviceId = kidDeviceId;
    this.type = type;
    this.peerConnection = null;
    this.remoteStream = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.onStreamCallback = null;
    this.onStatusCallback = null;
  }

  onStream(callback) {
    this.onStreamCallback = callback;
  }

  onStatus(callback) {
    this.onStatusCallback = callback;
  }

  updateStatus(status) {
    if (this.onStatusCallback) {
      this.onStatusCallback(status);
    }
  }

  initPeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);
    this.remoteStream = new MediaStream();

    this.peerConnection.ontrack = (event) => {
      console.log(`[WebRTC] Received remote track (${this.type}):`, event.track.kind);
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream.addTrack(track);
      });
      if (this.onStreamCallback) {
        this.onStreamCallback(this.remoteStream);
      }
      this.updateStatus('LIVE');
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit('ice-candidate', {
          kidDeviceId: this.kidDeviceId,
          candidate: event.candidate
        });
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state: ${this.peerConnection.iceConnectionState}`);
      if (this.peerConnection.iceConnectionState === 'disconnected' || this.peerConnection.iceConnectionState === 'failed') {
        this.updateStatus('Disconnected');
      }
    };

    return this.peerConnection;
  }

  async handleOffer(offer, senderId) {
    this.initPeerConnection();
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    if (this.socket) {
      this.socket.emit('rtc-answer', {
        targetSocketId: senderId,
        answer
      });
    }
  }

  async handleIceCandidate(candidate) {
    if (this.peerConnection && candidate) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('[WebRTC] Error adding ICE candidate:', e);
      }
    }
  }

  startRecording() {
    if (!this.remoteStream || this.remoteStream.getTracks().length === 0) {
      console.warn('[WebRTC] No stream available to record.');
      return false;
    }

    this.recordedChunks = [];
    const mimeType = this.type === 'camera' ? 'video/webm;codecs=vp8,opus' : 'audio/webm';
    
    try {
      this.mediaRecorder = new MediaRecorder(this.remoteStream, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : ''
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000); // collect 1s blobs
      console.log(`[WebRTC] MediaRecorder started (${this.type})`);
      return true;
    } catch (e) {
      console.error('[WebRTC] Failed to start MediaRecorder:', e);
      return false;
    }
  }

  stopRecording() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, {
          type: this.type === 'camera' ? 'video/webm' : 'audio/webm'
        });
        this.recordedChunks = [];
        console.log(`[WebRTC] MediaRecorder stopped. Blob size: ${blob.size}`);
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  close() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.remoteStream = null;
    this.updateStatus('Offline');
  }
}
