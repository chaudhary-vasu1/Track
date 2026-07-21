const Alert = require('../models/Alert');
const Kid = require('../models/Kid');

// Reference to socket.io instance, set during server init
let ioInstance = null;

function setSocketIO(io) {
  ioInstance = io;
}

/**
 * Generate an alert, save to DB, and push to parent dashboard in real-time.
 */
async function generateAlert(parentId, kidDeviceId, type, details = {}) {
  const alertConfig = getAlertConfig(type, details);

  try {
    const alert = new Alert({
      parentId,
      kidDeviceId,
      type,
      title: alertConfig.title,
      message: alertConfig.message,
      severity: alertConfig.severity,
      metadata: details
    });

    await alert.save();

    // Push to parent dashboard via WebSocket
    if (ioInstance) {
      ioInstance.to(`parent_${parentId}`).emit('new-alert', {
        id: alert._id,
        type: alert.type,
        title: alert.title,
        message: alert.message,
        severity: alert.severity,
        kidDeviceId: alert.kidDeviceId,
        metadata: alert.metadata,
        createdAt: alert.createdAt,
        isRead: false
      });
    }

    console.log(`[ALERT] ${alertConfig.severity.toUpperCase()}: ${alertConfig.title} (device: ${kidDeviceId})`);
    return alert;
  } catch (error) {
    console.error('Failed to generate alert:', error.message);
    return null;
  }
}

/**
 * Resolve parentId from a kidDeviceId if not already known.
 */
async function resolveParentId(kidDeviceId) {
  try {
    const kid = await Kid.findOne({ deviceId: kidDeviceId });
    return kid ? kid.parentId : null;
  } catch (e) {
    console.error('Failed to resolve parentId:', e.message);
    return null;
  }
}

/**
 * Convenience: generate alert when only deviceId is known (no parentId).
 */
async function generateAlertByDevice(kidDeviceId, type, details = {}) {
  const parentId = await resolveParentId(kidDeviceId);
  if (!parentId) {
    console.warn(`Cannot generate alert: no parent found for device ${kidDeviceId}`);
    return null;
  }
  return generateAlert(parentId, kidDeviceId, type, details);
}

/**
 * Map alert types to user-facing titles, messages, and severity levels.
 */
function getAlertConfig(type, details) {
  switch (type) {
    case 'screen_time_exceeded':
      return {
        title: 'Screen Time Limit Exceeded',
        message: `Daily screen time limit (${details.limit || 120} mins) was exceeded. Current usage: ${details.totalMinutes || '?'} minutes.`,
        severity: 'medium'
      };

    case 'website_blocked':
      return {
        title: 'Blocked Website Access Attempt',
        message: `Attempted to visit blocked website: "${details.website || 'unknown'}" via ${details.appName || 'browser'}.`,
        severity: 'high'
      };

    case 'app_blocked':
      return {
        title: 'Blocked App Launch Attempt',
        message: `Attempted to open blocked application: "${details.appName || 'unknown'}".`,
        severity: 'medium'
      };

    case 'geofence_exit':
      return {
        title: 'Geofence Boundary Crossed',
        message: `Device has moved outside the designated safe zone. Current coordinates: ${details.latitude || '?'}, ${details.longitude || '?'}.`,
        severity: 'high'
      };

    case 'permission_change':
      return {
        title: 'Device Permission Changed',
        message: `Permission "${details.permission || 'unknown'}" was ${details.granted ? 'granted' : 'revoked'} on the device.`,
        severity: details.granted ? 'low' : 'high'
      };

    case 'device_offline':
      return {
        title: 'Device Went Offline',
        message: `The monitored device has disconnected from the server. Last seen: ${details.lastSeen || 'unknown'}.`,
        severity: 'high'
      };

    case 'surveillance_started':
      return {
        title: 'Surveillance Session Started',
        message: `A ${details.sessionType || 'camera'} monitoring session was initiated on the device.`,
        severity: 'low'
      };

    default:
      return {
        title: 'System Alert',
        message: details.message || 'An event occurred that requires attention.',
        severity: 'medium'
      };
  }
}

module.exports = {
  setSocketIO,
  generateAlert,
  generateAlertByDevice,
  resolveParentId
};
