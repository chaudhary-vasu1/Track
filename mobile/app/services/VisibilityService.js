import { NativeModules, Platform } from 'react-native';

export class VisibilityService {
  static async hideAppIcon() {
    console.log('App Hiding Action Triggered.');
    if (Platform.OS === 'android') {
      try {
        if (NativeModules.VisibilityModule) {
          await NativeModules.VisibilityModule.disableLauncher();
        } else {
          console.warn('Native VisibilityModule is not available in Expo client shell. Hiding Simulated.');
        }
      } catch (err) {
        console.error('Failed to hide launcher activity:', err.message);
      }
    } else {
      console.log('Hiding launcher icon is not supported on iOS (requires profile configuration).');
    }
  }

  static async showAppIcon() {
    console.log('App Show Action Triggered.');
    if (Platform.OS === 'android') {
      try {
        if (NativeModules.VisibilityModule) {
          await NativeModules.VisibilityModule.enableLauncher();
        } else {
          console.warn('Native VisibilityModule is not available in Expo client shell. Showing Simulated.');
        }
      } catch (err) {
        console.error('Failed to restore launcher activity:', err.message);
      }
    }
  }
}
