import * as Location from 'expo-location';

export class LocationService {
  constructor(deviceId, socket) {
    this.deviceId = deviceId;
    this.socket = socket;
    this.subscription = null;
  }

  async startTracking() {
    try {
      const { status } = await Location.getBackgroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Background Location permissions not granted. Defaulting to foreground.');
      }

      this.subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // Send every 10 seconds
          distanceInterval: 1 // or if moved by 1 meter
        },
        (location) => {
          const telemetry = {
            kidDeviceId: this.deviceId,
            type: 'location_update',
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: new Date()
          };

          // Send to server via real-time WebSocket channel
          if (this.socket && this.socket.connected) {
            this.socket.emit('telemetry-update', telemetry);
          }
        }
      );
      
      console.log('Background GPS tracking started.');
    } catch (e) {
      console.error('Location tracking error:', e.message);
    }
  }

  stopTracking() {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
      console.log('GPS tracking stopped.');
    }
  }
}
