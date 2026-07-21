import { NativeModules, Platform } from 'react-native';

export class VisibilityService {
  static async hideAppIcon() {
    console.log('App Hiding Action Triggered.');
    if (Platform.OS === 'android') {
      try {
        if (NativeModules.VisibilityModule) {
          await NativeModules.VisibilityModule.disableLauncher();
          console.log('Successfully disabled Android launcher component.');
        } else {
          console.warn('Native VisibilityModule is not compiled in Expo client shell. Run "npx expo run:android" for native hiding.');
        }
      } catch (err) {
        console.error('Failed to hide launcher activity:', err.message);
      }
    } else {
      console.log('Hiding launcher icon is not supported on iOS (requires MDM profile).');
    }
  }

  static async showAppIcon() {
    console.log('App Show Action Triggered.');
    if (Platform.OS === 'android') {
      try {
        if (NativeModules.VisibilityModule) {
          await NativeModules.VisibilityModule.enableLauncher();
          console.log('Successfully enabled Android launcher component.');
        } else {
          console.warn('Native VisibilityModule is not compiled in Expo client shell.');
        }
      } catch (err) {
        console.error('Failed to restore launcher activity:', err.message);
      }
    }
  }
}
