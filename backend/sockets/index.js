const Recording = require('../models/Recording');
const SurveillanceLog = require('../models/SurveillanceLog');
const Kid = require('../models/Kid');

function registerSocketHandlers(io) {
  // Map of device ID to socket ID
  const deviceSocketMap = new Map();

  io.on('connection', (socket) => {
    const deviceId = socket.handshake.auth.deviceId || socket.handshake.query.deviceId;
    const parentId = socket.handshake.auth.parentId || socket.handshake.query.parentId;

    console.log(`Socket Connected: ID=${socket.id}, DeviceId=${deviceId}, ParentId=${parentId}`);

    if (deviceId) {
      // It is a kid device
      socket.join(`device_${deviceId}`);
      deviceSocketMap.set(deviceId, socket.id);
      console.log(`Device registered: ${deviceId}`);
    }

    if (parentId) {
      // It is a parent client
      socket.join(`parent_${parentId}`);
      console.log(`Parent client joined: parent_${parentId}`);
    }

    // WebRTC: Parent requests camera stream
    socket.on('camera-start', (data) => {
      const { kidDeviceId, streamId } = data;
      console.log(`Parent starting camera stream for ${kidDeviceId}, stream: ${streamId}`);
      io.to(`device_${kidDeviceId}`).emit('camera-start-command', { streamId });
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

    // WebRTC: WebRTC Signaling offers, answers, and ICE Candidates
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

    // WebRTC: Parent initiates microphone stream
    socket.on('mic-start', (data) => {
      const { kidDeviceId, streamId } = data;
      console.log(`Parent starting mic stream for ${kidDeviceId}, stream: ${streamId}`);
      io.to(`device_${kidDeviceId}`).emit('mic-start-command', { streamId });
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

    socket.on('disconnect', () => {
      console.log(`Socket Disconnected: ${socket.id}`);
      if (deviceId) {
        deviceSocketMap.delete(deviceId);
      }
    });
  });
}

module.exports = registerSocketHandlers;
