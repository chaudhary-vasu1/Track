const Recording = require('../models/Recording');
const SurveillanceLog = require('../models/SurveillanceLog');
const Kid = require('../models/Kid');
const { generateAlert, generateAlertByDevice } = require('../services/alert.service');

function registerSocketHandlers(io) {
  // Map of device ID to socket ID
  const deviceSocketMap = new Map();
  // Map of active WebRTC streams: streamId -> { parentSocketId, deviceSocketId }
  const activeStreams = new Map();
  // Map for pending offline alert grace timers: deviceId -> timer
  const offlineGraceTimers = new Map();

  io.on('connection', (socket) => {
    let deviceId = socket.handshake.auth.deviceId || socket.handshake.query.deviceId;
    let parentId = socket.handshake.auth.parentId || socket.handshake.query.parentId;

    console.log(`Socket Connected: ID=${socket.id}, DeviceId=${deviceId || 'undefined'}, ParentId=${parentId || 'undefined'}`);

    if (deviceId) {
      // It is a kid device
      socket.join(`device_${deviceId}`);
      deviceSocketMap.set(deviceId, socket.id);
      console.log(`DEVICE CONNECTED: deviceId=${deviceId}, socketId=${socket.id}`);

      // If device reconnects during grace period, cancel pending offline alert
      if (offlineGraceTimers.has(deviceId)) {
        clearTimeout(offlineGraceTimers.get(deviceId));
        offlineGraceTimers.delete(deviceId);
        console.log(`Device ${deviceId} reconnected within grace period. Cancelled offline alert.`);
      }
    }

    if (parentId) {
      // It is a parent client
      socket.join(`parent_${parentId}`);
      console.log(`PARENT CONNECTED: parentId=${parentId}, socketId=${socket.id}`);
    }

    // Explicit Device Registration Event Listener
    socket.on('register-device', (data, callback) => {
      const regDeviceId = data?.deviceId || deviceId;
      const regParentId = data?.parentId || parentId;

      if (regDeviceId) {
        deviceId = regDeviceId;
        socket.join(`device_${regDeviceId}`);
        deviceSocketMap.set(regDeviceId, socket.id);

        if (offlineGraceTimers.has(regDeviceId)) {
          clearTimeout(offlineGraceTimers.get(regDeviceId));
          offlineGraceTimers.delete(regDeviceId);
        }
      }

      if (regParentId) {
        parentId = regParentId;
        socket.join(`parent_${regParentId}`);
      }

      console.log(`Device Registered via Event:\nDeviceId=${regDeviceId}\nParentId=${regParentId}`);

      if (typeof callback === 'function') {
        callback({ status: 'ok', deviceId: regDeviceId, parentId: regParentId });
      }
    });

    // =====================================================
    // WebRTC Signaling via simple-peer
    // =====================================================

    // Unified signal relay: parent → device
    socket.on('webrtc-signal-to-device', (data) => {
      const { kidDeviceId, signal, streamType } = data;
      console.log(`WebRTC signal to device ${kidDeviceId} (${streamType || 'camera'})`);
      io.to(`device_${kidDeviceId}`).emit('webrtc-signal-from-parent', {
        signal,
        streamType: streamType || 'camera',
        parentSocketId: socket.id
      });
    });

    // Unified signal relay: device → parent
    socket.on('webrtc-signal-to-parent', (data) => {
      const { parentSocketId, signal, streamType } = data;
      console.log(`WebRTC signal to parent from device (${streamType || 'camera'})`);
      io.to(parentSocketId).emit('webrtc-signal-from-device', {
        signal,
        streamType: streamType || 'camera',
        deviceSocketId: socket.id
      });
    });

    // Live Camera Frame Relay from device to parent
    socket.on('camera-frame', (data) => {
      const { kidDeviceId } = data;
      io.emit('camera-frame', data);
    });

    socket.on('camera-started', (data) => {
      console.log(`Camera stream started on device ${data.kidDeviceId}`);
      io.emit('camera-started', data);
    });

    socket.on('camera-stopped', (data) => {
      console.log(`Camera stream stopped on device ${data.kidDeviceId}`);
      io.emit('camera-stopped', data);
    });

    // Live Mic Stream Relay from device to parent
    socket.on('mic-data', (data) => {
      io.emit('mic-data', data);
    });

    socket.on('mic-started', (data) => {
      console.log(`Mic stream started on device ${data.kidDeviceId}`);
      io.emit('mic-started', data);
    });

    socket.on('mic-stopped', (data) => {
      console.log(`Mic stream stopped on device ${data.kidDeviceId}`);
      io.emit('mic-stopped', data);
    });

    // =====================================================
    // Camera Commands
    // =====================================================

    // WebRTC: Parent requests camera stream
    socket.on('camera-start', (data) => {
      const { kidDeviceId, streamId } = data;
      console.log(`COMMAND SENT: camera-start to device_${kidDeviceId}`);
      activeStreams.set(streamId, { parentSocketId: socket.id, kidDeviceId });
      io.to(`device_${kidDeviceId}`).emit('camera-start-command', {
        streamId,
        parentSocketId: socket.id
      });
    });

    // WebRTC: Parent switches camera facing mode (front vs back)
    socket.on('camera-switch', (data) => {
      const { kidDeviceId, facing } = data; // facing is 'front' or 'back'
      console.log(`Parent switching camera facing for ${kidDeviceId} to ${facing}`);
      io.to(`device_${kidDeviceId}`).emit('camera-switch-command', { facing });
    });

    // WebRTC: Parent stops camera
    socket.on('camera-stop', async (data) => {
      const { kidDeviceId } = data;
      console.log(`Parent stopping camera for ${kidDeviceId}`);
      io.to(`device_${kidDeviceId}`).emit('camera-stop-command');

      // Create Surveillance Audit Log
      try {
        await SurveillanceLog.create({
          parentId,
          kidDeviceId,
          type: 'camera',
          startedAt: new Date(Date.now() - 30000), // mock 30s
          endedAt: new Date(),
          duration: 30,
          status: 'completed',
          isRecorded: false
        });
      } catch (err) {
        console.error('Failed to write SurveillanceLog:', err.message);
      }
    });

    // Legacy WebRTC: Signaling offers, answers, and ICE Candidates
    socket.on('rtc-offer', (data) => {
      const { kidDeviceId, offer } = data;
      console.log(`rtc-offer signaling for device ${kidDeviceId}`);
      io.to(`device_${kidDeviceId}`).emit('rtc-offer', { offer, senderId: socket.id });
    });

    socket.on('rtc-answer', (data) => {
      const { targetSocketId, answer } = data;
      console.log(`rtc-answer signaling back to target client`);
      io.to(targetSocketId).emit('rtc-answer', { answer });
    });

    socket.on('ice-candidate', (data) => {
      const { kidDeviceId, candidate, targetSocketId } = data;
      if (kidDeviceId) {
        io.to(`device_${kidDeviceId}`).emit('ice-candidate', { candidate, senderId: socket.id });
      } else if (targetSocketId) {
        io.to(targetSocketId).emit('ice-candidate', { candidate });
      }
    });

    // Recording Controls: Parent starts video recording
    socket.on('camera-record-start', (data) => {
      const { kidDeviceId } = data;
      io.to(`device_${kidDeviceId}`).emit('camera-record-start');
    });

    // Recording Controls: Parent stops video recording
    socket.on('camera-record-stop', (data) => {
      const { kidDeviceId } = data;
      io.to(`device_${kidDeviceId}`).emit('camera-record-stop');
    });

    // =====================================================
    // Microphone Commands
    // =====================================================

    // WebRTC: Parent initiates microphone stream
    socket.on('mic-start', (data) => {
      const { kidDeviceId, streamId } = data;
      console.log(`COMMAND SENT: mic-start to device_${kidDeviceId}`);
      io.to(`device_${kidDeviceId}`).emit('mic-start-command', {
        streamId,
        parentSocketId: socket.id
      });
    });

    // WebRTC: Parent stops microphone stream
    socket.on('mic-stop', (data) => {
      const { kidDeviceId } = data;
      console.log(`Parent stopping mic for ${kidDeviceId}`);
      io.to(`device_${kidDeviceId}`).emit('mic-stop-command');
    });

    socket.on('mic-record-start', (data) => {
      const { kidDeviceId } = data;
      io.to(`device_${kidDeviceId}`).emit('mic-record-start');
    });

    socket.on('mic-record-stop', (data) => {
      const { kidDeviceId } = data;
      io.to(`device_${kidDeviceId}`).emit('mic-record-stop');
    });

    // =====================================================
    // App Visibility Commands
    // =====================================================

    // Hiding / Showing Application Launcher Icon
    socket.on('app-hide', (data) => {
      const { kidDeviceId } = data;
      console.log(`Parent command: Hide App for ${kidDeviceId}`);
      io.to(`device_${kidDeviceId}`).emit('app-hide-command');
    });

    socket.on('app-show', (data) => {
      const { kidDeviceId } = data;
      console.log(`Parent command: Show App for ${kidDeviceId}`);
      io.to(`device_${kidDeviceId}`).emit('app-show-command');
    });

    // =====================================================
    // Telemetry & Real-time Data
    // =====================================================

    // Telemetry updates in real-time from kid's device
    socket.on('telemetry-update', async (data) => {
      const { kidDeviceId, type, latitude, longitude, appName, screenTimeMinutes } = data;
      console.log(`Received real-time telemetry from ${kidDeviceId}: type=${type}`);
      
      // Broadcast to parent dashboard listening room
      if (parentId) {
        io.to(`parent_${parentId}`).emit('telemetry-update', data);
      } else {
        // Find kid's parent ID and emit to them
        try {
          const kid = await Kid.findOne({ deviceId: kidDeviceId });
          if (kid) {
            io.to(`parent_${kid.parentId}`).emit('telemetry-update', data);
          }
        } catch (e) {
          console.error(e.message);
        }
      }
    });



    // =====================================================
    // Connection Lifecycle
    // =====================================================

    socket.on('disconnect', async (reason) => {
      console.log(`Socket Disconnected: ${socket.id}, reason=${reason}`);
      if (deviceId && reason !== 'transport upgrade') {
        // Clear active socket mapping
        if (deviceSocketMap.get(deviceId) === socket.id) {
          deviceSocketMap.delete(deviceId);
        }

        // Set a 5-second grace period before generating offline alert
        if (offlineGraceTimers.has(deviceId)) {
          clearTimeout(offlineGraceTimers.get(deviceId));
        }

        const timer = setTimeout(async () => {
          // If device hasn't reconnected after 5 seconds, trigger alert
          if (!deviceSocketMap.has(deviceId)) {
            try {
              console.log(`Device ${deviceId} confirmed offline after 5s grace period.`);
              await generateAlertByDevice(deviceId, 'device_offline', {
                lastSeen: new Date().toISOString()
              });
            } catch (e) {
              console.error('Failed to generate offline alert:', e.message);
            }
          }
          offlineGraceTimers.delete(deviceId);
        }, 5000);

        offlineGraceTimers.set(deviceId, timer);
      }
    });
  });
}

module.exports = registerSocketHandlers;
