import { NativeModules, Platform } from 'react-native';

export class AppUsageService {
  constructor(deviceId, socket, backendUrl) {
    this.deviceId = deviceId;
    this.socket = socket;
    this.backendUrl = backendUrl;
    this.intervalId = null;
    this.lastForegroundApp = null;
  }

  startMonitoring(pollIntervalMs = 15000) {
    console.log('App Usage Monitoring Service started.');
    
    this.intervalId = setInterval(() => {
      this.checkForegroundApp();
    }, pollIntervalMs);
  }

  async checkForegroundApp() {
    if (Platform.OS === 'android') {
      try {
        if (NativeModules.UsageStatsModule) {
          const currentApp = await NativeModules.UsageStatsModule.getForegroundApp();
          if (currentApp && currentApp !== this.lastForegroundApp) {
            console.log(`[APP MON] App opened: ${currentApp}`);
            this.lastForegroundApp = currentApp;
            this.sendAppLog(currentApp, 'app_open');
          }

          // Fetch full 24h usage stats breakdown
          if (NativeModules.UsageStatsModule.getAppUsageStats) {
            const fullUsage = await NativeModules.UsageStatsModule.getAppUsageStats();
            if (fullUsage && Array.isArray(fullUsage) && fullUsage.length > 0) {
              for (const appItem of fullUsage) {
                if (appItem.appName && appItem.minutes > 0) {
                  this.sendAppLog(appItem.appName, 'app_usage', appItem.minutes);
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('UsageStatsModule check failed:', err.message);
      }
    }
  }

  async sendAppLog(appName, type = 'app_open', screenTimeMinutes = 5) {
    const telemetry = {
      kidDeviceId: this.deviceId,
      type,
      appName,
      screenTimeMinutes,
      timestamp: new Date()
    };

    // Emit via WebSocket for instant dashboard update
    if (this.socket && this.socket.connected) {
      this.socket.emit('telemetry-update', telemetry);
    }

    // Post to REST API database logger
    try {
      if (this.backendUrl) {
        await fetch(`${this.backendUrl}/api/monitoring/log`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(telemetry)
        });
      }
    } catch (e) {
      console.warn('Failed to send app log REST request:', e.message);
    }
  }

  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('App Usage Monitoring stopped.');
    }
  }
}
