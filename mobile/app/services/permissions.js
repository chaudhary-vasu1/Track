import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';

export async function requestAllPermissions() {
  try {
    const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
    const { status: audioStatus } = await Audio.requestPermissionsAsync();
    
    const { status: fgLocStatus } = await Location.requestForegroundPermissionsAsync();
    let bgLocStatus = 'denied';
    
    if (fgLocStatus === 'granted') {
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      bgLocStatus = bgStatus;
    }

    const allGranted = 
      cameraStatus === 'granted' && 
      audioStatus === 'granted' && 
      fgLocStatus === 'granted';

    return {
      allGranted,
      details: {
        camera: cameraStatus,
        audio: audioStatus,
        locationForeground: fgLocStatus,
        locationBackground: bgLocStatus
      }
    };
  } catch (error) {
    console.error('Permission Request Error:', error.message);
    return { allGranted: false, details: {} };
  }
}
